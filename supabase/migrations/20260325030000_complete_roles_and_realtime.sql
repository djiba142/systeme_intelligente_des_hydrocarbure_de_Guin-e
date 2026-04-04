-- =============================================
-- FINAL BACKEND COMPLETION (SIHG)
-- 1. Role Synchronization
-- 2. Realtime Enablement
-- 3. Storage Bucket Security
-- =============================================

BEGIN;

-- 1. ROLE SYNCHRONIZATION
-- Safe addition of all missing roles from src/types/roles.ts
DO $$
DECLARE
    roles text[] := ARRAY[
        'chef_regulation',
        'analyste_regulation',
        'chef_service_importation',
        'agent_suivi_cargaison',
        'agent_reception_port',
        'analyste_approvisionnement',
        'agent_reception',
        'superviseur_aval',
        'personnel_admin',
        'directeur_financier',
        'gestionnaire'
    ];
    r text;
BEGIN
    FOR r IN SELECT unnest(roles) LOOP
        BEGIN
            EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''' || r || '''';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END LOOP;
END $$;

-- 2. REALTIME ENABLEMENT
-- Add operational tables to the publication for instant dashboard updates
-- (Check if publication exists, standard in Supabase is 'supabase_realtime')
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers_entreprise;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dossier_documents;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dossier_historique;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.importations_v1;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.entreprises;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alertes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.livraisons;
    END IF;
EXCEPTION WHEN duplicate_object THEN 
    -- If some tables are already in, skip and don't fail the transaction
    NULL;
END $$;

-- 3. STORAGE BUCKET POLICIES (Dossiers)
-- Ensure 'dossiers' bucket exists and is secure but accessible to the right roles
INSERT INTO storage.buckets (id, name, public)
SELECT 'dossiers', 'dossiers', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'dossiers');

-- Drop existing generic policy if any to avoid confusion
-- (Note: Policy names must be unique per table/bucket)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- Select: All authenticated SONAP personnel can view dossiers
CREATE POLICY "sonap_view_dossiers" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dossiers');

-- Insert: Agent Reception & Super Admin can upload documents
CREATE POLICY "sonap_upload_dossiers" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'dossiers' AND 
    (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('agent_reception', 'super_admin', 'agent_importation')
    ))
);

-- Delete: Only Super Admin can delete documents
CREATE POLICY "sonap_delete_dossiers" ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'dossiers' AND 
    (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    ))
);

COMMIT;
