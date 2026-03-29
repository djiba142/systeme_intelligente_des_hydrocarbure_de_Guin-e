-- ============================================================
-- MIGRATION: Auto-IDs for Entreprises & Stations + Account Status
-- Date: 2026-03-29
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES: Add statut column (inactif by default)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'inactif'
  CHECK (statut IN ('inactif', 'actif', 'suspendu'));

-- Comment on the column
COMMENT ON COLUMN public.profiles.statut IS
  'Statut du compte: inactif (en attente d''activation DSI), actif, ou suspendu.';

-- ─────────────────────────────────────────────────────────────
-- 2. ENTREPRISES: Auto-generate numero_agrement (ENT-YYYY-XXXX)
-- ─────────────────────────────────────────────────────────────

-- Create sequence for entreprise IDs per year
CREATE SEQUENCE IF NOT EXISTS seq_entreprise_id START 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE;

-- Function to generate the ENT ID
CREATE OR REPLACE FUNCTION generate_entreprise_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  seq_val      BIGINT;
  new_id       TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  seq_val      := NEXTVAL('seq_entreprise_id');
  new_id       := 'ENT-' || current_year || '-' || LPAD(seq_val::TEXT, 4, '0');
  RETURN new_id;
END;
$$;

-- Trigger function: auto-populate numero_agrement on INSERT if empty
CREATE OR REPLACE FUNCTION set_entreprise_numero_agrement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-generate if left blank by the user
  IF NEW.numero_agrement IS NULL OR TRIM(NEW.numero_agrement) = '' THEN
    NEW.numero_agrement := generate_entreprise_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_set_entreprise_numero_agrement ON public.entreprises;
CREATE TRIGGER trg_set_entreprise_numero_agrement
  BEFORE INSERT ON public.entreprises
  FOR EACH ROW
  EXECUTE FUNCTION set_entreprise_numero_agrement();

-- ─────────────────────────────────────────────────────────────
-- 3. STATIONS: Auto-generate code (STA-YYYY-XXXX)
-- ─────────────────────────────────────────────────────────────

-- Create sequence for station codes
CREATE SEQUENCE IF NOT EXISTS seq_station_id START 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE;

-- Function to generate the STA code
CREATE OR REPLACE FUNCTION generate_station_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  seq_val      BIGINT;
  new_code     TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  seq_val      := NEXTVAL('seq_station_id');
  new_code     := 'STA-' || current_year || '-' || LPAD(seq_val::TEXT, 4, '0');
  RETURN new_code;
END;
$$;

-- Trigger function: auto-populate code on INSERT if empty
CREATE OR REPLACE FUNCTION set_station_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR TRIM(NEW.code) = '' THEN
    NEW.code := generate_station_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS trg_set_station_code ON public.stations;
CREATE TRIGGER trg_set_station_code
  BEFORE INSERT ON public.stations
  FOR EACH ROW
  EXECUTE FUNCTION set_station_code();

-- ─────────────────────────────────────────────────────────────
-- 4. RLS: Allow service_it and super_admin to update statut
-- ─────────────────────────────────────────────────────────────

-- Allow DSI / Super Admin to activate accounts (update statut)
DROP POLICY IF EXISTS "dsi_can_update_profile_statut" ON public.profiles;
CREATE POLICY "dsi_can_update_profile_statut"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('service_it', 'super_admin')
    )
  )
  WITH CHECK (true);
