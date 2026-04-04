-- ====================================================================
-- SIHG INSPECTION MODULE PRO - HIERARCHICAL WORKFLOW
-- ====================================================================

-- 1. ROLES EXPANSION
-- Adding specialized inspector roles for geographical hierarchy
DO $$ BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inspecteur_terrain';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inspecteur_prefectoral';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inspecteur_regional';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inspecteur_national';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. MISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.inspections_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_mission TEXT UNIQUE NOT NULL, -- e.g. MSN-2024-001
    inspecteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    date_prevue DATE NOT NULL,
    statut TEXT DEFAULT 'assignee' CHECK (statut IN ('assignee', 'en_cours', 'achevee', 'annulee')),
    priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('haute', 'normale', 'basse')),
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INSPECTION REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.inspections_rapports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID REFERENCES public.inspections_missions(id) ON DELETE SET NULL,
    inspecteur_id UUID REFERENCES auth.users(id) NOT NULL,
    station_id UUID REFERENCES public.stations(id) NOT NULL,
    date_inspection TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Field Data
    etat_station TEXT CHECK (etat_station IN ('conforme', 'non_conforme', 'suspension_requise')),
    stock_essence_reel INTEGER, -- Litres
    stock_gasoil_reel INTEGER,   -- Litres
    prix_essence_constate INTEGER, -- GNF
    prix_gasoil_constate INTEGER,   -- GNF
    
    -- Verification
    est_conforme BOOLEAN DEFAULT true,
    anomalies_detectees TEXT[], -- Array of common issues (fraude, prix, stock, hygiène, etc.)
    observations TEXT,
    photos_urls TEXT[], -- Array of Cloud Storage links
    
    statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'soumis', 'valide', 'archive')),
    
    -- Geographical metadata for RLS efficiency
    prefecture TEXT,
    region TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. GEOGRAPHICAL SCOPE HELPER
-- This ensures reports inherit station geography for easier RLS
CREATE OR REPLACE FUNCTION public.sync_inspection_geography()
RETURNS TRIGGER AS $$
BEGIN
    SELECT region, prefecture INTO NEW.region, NEW.prefecture 
    FROM public.stations WHERE id = NEW.station_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_inspection_geo
BEFORE INSERT OR UPDATE ON public.inspections_rapports
FOR EACH ROW EXECUTE PROCEDURE public.sync_inspection_geography();

-- 5. SECURITY (RLS)
ALTER TABLE public.inspections_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections_rapports ENABLE ROW LEVEL SECURITY;

-- 5.1. MISSIONS ACCESS
-- Inspectors see their own missions
CREATE POLICY "inspecteurs_own_missions" ON public.inspections_missions
FOR SELECT TO authenticated
USING (
    inspecteur_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('inspecteur_national', 'super_admin', 'directeur_aval'))
);

-- Regional/Prefectural access to missions via station location
CREATE POLICY "geo_missions_access" ON public.inspections_missions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.stations s ON s.id = public.inspections_missions.station_id
        WHERE p.user_id = auth.uid() AND (
            (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'inspecteur_regional') AND s.region = p.region) OR
            (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'inspecteur_prefectoral') AND s.prefecture = p.prefecture)
        )
    )
);

-- 5.2. REPORTS ACCESS
-- Terrain: Read/Write own
CREATE POLICY "rapports_terrain_own" ON public.inspections_rapports
FOR ALL TO authenticated
USING (inspecteur_id = auth.uid())
WITH CHECK (inspecteur_id = auth.uid());

-- Prefectural: Read zone
CREATE POLICY "rapports_prefectural_zone" ON public.inspections_rapports
FOR SELECT TO authenticated
USING (
    prefecture = (SELECT prefecture FROM public.profiles WHERE user_id = auth.uid()) 
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'inspecteur_prefectoral')
);

-- Regional: Read zone
CREATE POLICY "rapports_regional_zone" ON public.inspections_rapports
FOR SELECT TO authenticated
USING (
    region = (SELECT region FROM public.profiles WHERE user_id = auth.uid()) 
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'inspecteur_regional')
);

-- National/SuperAdmin/Directions: Read ALL
CREATE POLICY "rapports_read_all" ON public.inspections_rapports
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (
        'inspecteur_national', 'super_admin', 'directeur_general', 'admin_central', 
        'directeur_aval', 'directeur_juridique', 'directeur_administratif'
    ))
);

-- 6. AUDIT & UPDATED_AT
CREATE TRIGGER handle_updated_at_missions BEFORE UPDATE ON public.inspections_missions FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER handle_updated_at_rapports BEFORE UPDATE ON public.inspections_rapports FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
