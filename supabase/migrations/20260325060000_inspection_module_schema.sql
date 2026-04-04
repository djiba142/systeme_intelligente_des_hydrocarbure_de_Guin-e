-- =============================================
-- INSPECTION MODULE SCHEMA (SIHG)
-- Tables for tracking missions, reports and field observations.
-- =============================================

BEGIN;

-- 1. TABLES

-- Table for quick field observations (informal notes)
CREATE TABLE IF NOT EXISTS public.observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    station_nom TEXT,
    inspecteur_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, 
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    statut TEXT DEFAULT 'ouverte',
    region TEXT,
    stock_essence_reel NUMERIC,
    stock_gasoil_reel NUMERIC,
    ecart_essence NUMERIC,
    ecart_gasoil NUMERIC,
    prefecture TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for formal inspection missions
CREATE TABLE IF NOT EXISTS public.inspections_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    inspecteur_id UUID REFERENCES auth.users(id),
    numero_mission TEXT UNIQUE NOT NULL,
    date_prevue DATE NOT NULL,
    statut TEXT DEFAULT 'assignee', -- assignee, en_cours, achevee, annulee
    observations_preliminaires TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for formal inspection reports
CREATE TABLE IF NOT EXISTS public.inspections_rapports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID REFERENCES public.inspections_missions(id) ON DELETE CASCADE,
    inspecteur_id UUID REFERENCES auth.users(id),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    etat_station TEXT, -- conforme, non_conforme
    stock_essence_reel INTEGER DEFAULT 0,
    stock_gasoil_reel INTEGER DEFAULT 0,
    prix_essence_constate INTEGER DEFAULT 0,
    prix_gasoil_constate INTEGER DEFAULT 0,
    est_conforme BOOLEAN DEFAULT true,
    observations TEXT,
    anomalies_detectees JSONB DEFAULT '[]'::jsonb,
    statut TEXT DEFAULT 'brouillon', -- brouillon, soumis
    date_inspection TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SECURITY (RLS)

-- Observations
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view observations
CREATE POLICY "inspect_view_observations" ON public.observations FOR SELECT TO authenticated USING (true);

-- Only inspectors and managers can manage observations
CREATE POLICY "inspect_manage_observations" ON public.observations FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'inspecteur', 'directeur_aval', 'chef_service_aval')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'inspecteur', 'directeur_aval', 'chef_service_aval')));

-- Missions
ALTER TABLE public.inspections_missions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view missions
CREATE POLICY "inspect_view_missions" ON public.inspections_missions FOR SELECT TO authenticated USING (true);

-- Only managers can delete/create missions, inspectors can update (status)
CREATE POLICY "inspect_admin_missions" ON public.inspections_missions FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_aval', 'chef_service_aval')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_aval', 'chef_service_aval')));

CREATE POLICY "inspect_update_self_mission" ON public.inspections_missions FOR UPDATE TO authenticated 
USING (inspecteur_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_aval')))
WITH CHECK (inspecteur_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_aval')));

-- Rapports
ALTER TABLE public.inspections_rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspect_view_rapports" ON public.inspections_rapports FOR SELECT TO authenticated USING (true);

CREATE POLICY "inspect_manage_rapports" ON public.inspections_rapports FOR ALL TO authenticated 
USING (inspecteur_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin')))
WITH CHECK (inspecteur_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin')));

-- 3. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.observations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections_rapports;

COMMIT;
