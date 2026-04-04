-- IMPORTATION & LOGISTIQUE WORKFLOW (Unified with existing import_* tables)
-- End-to-end traceability: Port -> Depot -> Station

-- 1. Enum for Tanker Status (Physical tracking)
DO $$ BEGIN
    CREATE TYPE tanker_status AS ENUM ('en_mer', 'arrive', 'en_controle', 'conforme', 'non_conforme', 'en_dechargement', 'decharge');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Port Receptions (Enregistrement au port) - Linked to existing import_cargaisons (Cargaisons)
CREATE TABLE IF NOT EXISTS public.port_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id),
    actual_quantity NUMERIC NOT NULL,
    arrival_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Quality Controls (Contrôle Qualité)
CREATE TABLE IF NOT EXISTS public.quality_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES public.profiles(id),
    is_compliant BOOLEAN DEFAULT false,
    quantity_verified NUMERIC,
    laboratory_report_url TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Depot Transfers (Mouvements vers Dépôts)
CREATE TABLE IF NOT EXISTS public.depot_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id),
    depot_id UUID REFERENCES public.logistique_depots(id),
    quantity NUMERIC NOT NULL,
    status TEXT DEFAULT 'en_transfert', -- 'en_transfert', 'complete'
    validated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS Policies
ALTER TABLE public.port_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depot_transfers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Enable read for all authenticated users" ON public.port_receptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for all authenticated users" ON public.quality_controls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for all authenticated users" ON public.depot_transfers FOR SELECT TO authenticated USING (true);

-- Specific write permissions
-- Agent Réception Port can log receptions
CREATE POLICY "Enable write for port agents" ON public.port_receptions 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'agent_reception_port')));

-- Inspectors can log quality controls
CREATE POLICY "Enable write for inspectors" ON public.quality_controls 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'inspecteur', 'agent_technique_aval')));

-- Logistics staff can manage transfers
CREATE POLICY "Enable write for logistics staff" ON public.depot_transfers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_logistique', 'agent_logistique', 'responsable_depots')));
