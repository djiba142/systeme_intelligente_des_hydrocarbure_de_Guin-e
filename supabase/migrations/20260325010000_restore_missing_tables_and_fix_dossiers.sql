-- ====================================================================
-- RESTORATION MIGRATION: RE-INTRODUCE MISSING CORE TABLES
-- Author: SIHG Recovery Agent
-- Date: 2026-03-25
-- ====================================================================

-- 0. PRE-REQUISITE: Remove legacy table/view conflict
DROP VIEW IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.dossiers CASCADE;
DROP VIEW IF EXISTS public.importations CASCADE;
DROP TABLE IF EXISTS public.importations CASCADE;

BEGIN;

-- 1. ENUMS (Ensure they exist)
DO $$ BEGIN
    CREATE TYPE regulation_statut_quota AS ENUM ('en_analyse', 'propose', 'valide', 'rejete', 'publie');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE regulation_statut_doc AS ENUM ('en_analyse', 'propose', 'valide', 'signe', 'rejete', 'publie', 'annule');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. LOGISTICS: ordres_livraison
CREATE TABLE IF NOT EXISTS public.ordres_livraison (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    carburant TEXT NOT NULL, 
    quantite_demandee INTEGER NOT NULL,
    priorite TEXT NOT NULL DEFAULT 'normale',
    statut TEXT NOT NULL DEFAULT 'en_attente',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approuve_par UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_order_target CHECK (station_id IS NOT NULL OR entreprise_id IS NOT NULL)
);

-- 3. REGULATION: regulation_quotas
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

-- 4. REGULATION: regulation_agrements
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

-- 5. REGULATION: regulation_licences
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

-- 6. REGULATION: regulation_logs
CREATE TABLE IF NOT EXISTS public.regulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. COMPATIBILITY: Update 'dossiers' view
CREATE VIEW public.dossiers AS
SELECT 
    d.id,
    d.numero_dossier,
    d.type_dossier as type_demande,
    d.entreprise_id as entite_id,
    'entreprise' as entite_type,
    e.nom as entite_nom,
    e.sigle as entite_sigle,
    d.statut::text as statut,
    'normale' as priorite,
    d.description as observations,
    COALESCE(
        (SELECT jsonb_agg(doc.*) FROM public.dossier_documents doc WHERE doc.dossier_id = d.id),
        '[]'::jsonb
    ) as pieces_jointes,
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

-- 8. SECURITY: RLS & Open Access for authenticated
DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY['ordres_livraison', 'regulation_quotas', 'regulation_agrements', 'regulation_licences', 'regulation_logs'];
BEGIN
    FOR t IN SELECT unnest(tables_to_fix) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable full access for authenticated" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Enable full access for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 9. REALTIME: Enable for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ordres_livraison;
ALTER PUBLICATION supabase_realtime ADD TABLE public.regulation_quotas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers_entreprise;

COMMIT;
