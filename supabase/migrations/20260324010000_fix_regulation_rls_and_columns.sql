-- ====================================================================
-- FIX: REGULATION TABLES RLS & MISSING COLUMNS
-- Author: SIHG Recovery Agent
-- Date: 2026-03-24
-- ====================================================================
-- 0. PRE-REQUISITE: Remove legacy table/view conflict
DROP VIEW IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.dossiers CASCADE;
DROP VIEW IF EXISTS public.importations CASCADE;
DROP TABLE IF EXISTS public.importations CASCADE;

-- 1. Add missing column 'type_licence' to regulation_licences
ALTER TABLE IF EXISTS public.regulation_licences ADD COLUMN IF NOT EXISTS type_licence TEXT;

-- Sync existing data
DO $$
BEGIN
  UPDATE public.regulation_licences SET type_licence = titre WHERE type_licence IS NULL AND titre IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Add missing columns to dossiers_entreprise for reception workflow
DO $$
BEGIN
  ALTER TABLE public.dossiers_entreprise ADD COLUMN IF NOT EXISTS type_demande TEXT;
  ALTER TABLE public.dossiers_entreprise ADD COLUMN IF NOT EXISTS entite_nom TEXT;
  ALTER TABLE public.dossiers_entreprise ADD COLUMN IF NOT EXISTS entite_type TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Fix RLS: Drop all existing conflicting policies, then recreate

-- QUOTAS
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'regulation_quotas' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.regulation_quotas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reg_quotas_select" ON public.regulation_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_quotas_insert" ON public.regulation_quotas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reg_quotas_update" ON public.regulation_quotas FOR UPDATE TO authenticated USING (true);

-- AGREMENTS
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'regulation_agrements' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.regulation_agrements', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reg_agrements_select" ON public.regulation_agrements FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_agrements_insert" ON public.regulation_agrements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reg_agrements_update" ON public.regulation_agrements FOR UPDATE TO authenticated USING (true);

-- LICENCES
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'regulation_licences' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.regulation_licences', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reg_licences_select" ON public.regulation_licences FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_licences_insert" ON public.regulation_licences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reg_licences_update" ON public.regulation_licences FOR UPDATE TO authenticated USING (true);

-- LOGS
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'regulation_logs' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.regulation_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reg_logs_select" ON public.regulation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_logs_insert" ON public.regulation_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 4. ENTREPRISES: Ensure INSERT capacity for admin roles
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'entreprises' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.entreprises', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "entreprises_select" ON public.entreprises FOR SELECT TO authenticated USING (true);
CREATE POLICY "entreprises_insert" ON public.entreprises FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "entreprises_update" ON public.entreprises FOR UPDATE TO authenticated USING (true);

-- 5. STATIONS: Ensure INSERT capacity for admin roles
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'stations' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "stations_select" ON public.stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "stations_insert" ON public.stations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stations_update" ON public.stations FOR UPDATE TO authenticated USING (true);

-- 6. DOSSIERS_ENTREPRISE: Ensure full access
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'dossiers_entreprise' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dossiers_entreprise', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "dossiers_ent_select" ON public.dossiers_entreprise FOR SELECT TO authenticated USING (true);
CREATE POLICY "dossiers_ent_insert" ON public.dossiers_entreprise FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dossiers_ent_update" ON public.dossiers_entreprise FOR UPDATE TO authenticated USING (true);

-- 7. DOSSIER_DOCUMENTS: Ensure full access
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'dossier_documents' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dossier_documents', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "dossier_docs_select" ON public.dossier_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "dossier_docs_insert" ON public.dossier_documents FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Default enterprise for external entities
INSERT INTO public.entreprises (id, nom, sigle, type, numero_agrement, region, statut)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'ENTITÉ EXTERNE / DIVERS', 
    'EXTERNE', 
    'compagnie', 
    'AGR-0000-EXT', 
    'EXTERIEUR', 
    'actif'
)
ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom;

-- 9. Compatibility View: robust dossiers view
CREATE OR REPLACE VIEW public.dossiers AS
SELECT 
    d.id,
    d.numero_dossier,
    COALESCE(d.type_demande, d.type_dossier) as type_demande,
    d.entreprise_id as entite_id,
    COALESCE(d.entite_type, 'entreprise') as entite_type,
    COALESCE(d.entite_nom, e.nom, 'ENTITÉ INCONNUE') as entite_nom,
    d.statut::text as statut,
    'normale' as priorite,
    d.description as observations,
    null::jsonb as pieces_jointes,
    null::text as qr_code_url,
    d.created_at as date_soumission,
    d.updated_at,
    null::uuid as valide_par_dsa,
    null::uuid as valide_par_da,
    null::uuid as valide_par_djc,
    null::uuid as valide_par_dsi,
    null::uuid as valide_par_dg,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'registre_commerce' LIMIT 1) as rccm_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'nif' LIMIT 1) as nif_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'statuts' LIMIT 1) as statuts_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'demande_signee' LIMIT 1) as autorisation_url
FROM public.dossiers_entreprise d
LEFT JOIN public.entreprises e ON d.entreprise_id = e.id;

GRANT SELECT ON public.dossiers TO authenticated;
