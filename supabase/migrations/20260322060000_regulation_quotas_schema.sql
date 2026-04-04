-- ==============================================================================
-- STRATÉGIE DE RÉGULATION NATIONALE & QUOTAS (ADMINISTRATEUR CENTRAL)
-- Philosophie : "La SONAP exécute, l'État décide"
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE regulation_statut_quota AS ENUM ('en_analyse', 'propose', 'valide', 'rejete', 'publie');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE regulation_statut_doc AS ENUM ('en_analyse', 'propose', 'valide', 'signe', 'rejete', 'publie', 'annule');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. GESTION DES QUOTAS 
CREATE TABLE IF NOT EXISTS public.regulation_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    produit TEXT NOT NULL,
    quantite NUMERIC(20,2) NOT NULL DEFAULT 0,
    quantite_utilisee NUMERIC(20,2) NOT NULL DEFAULT 0,
    periode TEXT NOT NULL, 
    statut public.regulation_statut_quota DEFAULT 'en_analyse',
    motif_rejet TEXT,
    propose_par UUID REFERENCES auth.users(id),
    valide_par UUID REFERENCES auth.users(id),
    publie_par UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GESTION ADMINISTRATIVE ET LÉGALE (Souveraineté de l'État)
-- A. Agréments
CREATE TABLE IF NOT EXISTS public.regulation_agrements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    numero TEXT UNIQUE NOT NULL,
    type_agrement TEXT NOT NULL, 
    statut public.regulation_statut_doc DEFAULT 'en_analyse',
    date_emission DATE,
    date_expiration DATE,
    motif_rejet TEXT,
    signe_par UUID REFERENCES auth.users(id),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Licences
CREATE TABLE IF NOT EXISTS public.regulation_licences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    numero TEXT UNIQUE NOT NULL,
    titre TEXT NOT NULL, 
    statut public.regulation_statut_doc DEFAULT 'en_analyse',
    date_emission DATE,
    date_expiration DATE,
    motif_rejet TEXT,
    signe_par UUID REFERENCES auth.users(id),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Log Table for Actions
CREATE TABLE IF NOT EXISTS public.regulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================================================
-- POLITIQUES DE SÉCURITÉ (RLS) - "ANALYSE -> CONTRÔLE -> DÉCISION"
-- ==============================================================================

ALTER TABLE public.regulation_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_agrements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_licences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable SELECT for all authenticated" ON public.regulation_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable SELECT for all authenticated" ON public.regulation_agrements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable SELECT for all authenticated" ON public.regulation_licences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable SELECT for all authenticated" ON public.regulation_logs FOR SELECT TO authenticated USING (true);

-- L'Admin Central a un accès complet
CREATE POLICY "Admin Central Full Quotas" ON public.regulation_quotas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central')));
CREATE POLICY "Admin Central Full Agrements" ON public.regulation_agrements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central')));
CREATE POLICY "Admin Central Full Licences" ON public.regulation_licences FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central')));
CREATE POLICY "Admin Central Full Logs" ON public.regulation_logs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation')));

-- Les Analystes et Chefs peuvent modifier les quotas sous condition
CREATE POLICY "Analystes et Chefs Update Quotas" ON public.regulation_quotas FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('chef_regulation', 'analyste_regulation')));
CREATE POLICY "Analystes et Chefs Update Agrements" ON public.regulation_agrements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('chef_regulation', 'analyste_regulation')));
CREATE POLICY "Analystes et Chefs Update Licences" ON public.regulation_licences FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('chef_regulation', 'analyste_regulation')));
