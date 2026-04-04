-- ====================================================================
-- SIHG GLOBAL BACKEND HARMONY & UNIFIED RLS
-- Consolidation of security policies and administrative permissions
-- Author: SIHG Recovery Agent
-- Date: 2026-03-22
-- ====================================================================

-- 1. UNIFIED ADMIN CHECK FUNCTION (Source of Truth)
-- This function is used in RLS policies across all tables.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN (
        'super_admin', 
        'admin_etat', 
        'service_it', 
        'admin_central',
        'directeur_general',
        'directeur_dsi' -- Added for safety
    )
  );
END;
$$;

-- 2. IT DIRECTOR RECOVERY & SYNC
-- Ensures the DSI (admin@nexus.com) is always Super Admin
DO $$
DECLARE
    v_user_id UUID := 'c6ac18f6-a125-4c83-b2f7-a773404c3968';
    v_email   TEXT := 'admin@nexus.com';
BEGIN
    -- Only proceed if user exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        
        -- A. user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

        -- B. profiles
        INSERT INTO public.profiles (user_id, email, full_name, organisation, poste)
        VALUES (v_user_id, v_email, 'Directeur Système Informatique', 'NEXUS / SONAP', 'DSI')
        ON CONFLICT (user_id) DO UPDATE SET 
            role = 'super_admin' -- In case it exists there
            WHERE profiles.user_id = v_user_id;
            
        -- Force poste and organisation
        UPDATE public.profiles 
        SET poste = 'Directeur Système Informatique', 
            organisation = 'Direction Système Informatique (SIHG)'
        WHERE user_id = v_user_id;

        -- C. auth.users metadata
        UPDATE auth.users 
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('role', 'super_admin', 'full_name', 'Directeur Système Informatique')
        WHERE id = v_user_id;

        RAISE NOTICE 'IT Director (admin@nexus.com) permissions synchronized.';
    END IF;
END $$;

-- 3. GLOBAL RLS BYPASS FOR ADMINS
-- This script iterates through ALL tables and adds the admin policy if not present
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    LOOP
        -- Enable RLS (just in case)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop old permissive policies if they have the standard name
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable full access for authenticated" ON public.%I', t);

        -- Create the master admin policy
        EXECUTE format('
            CREATE POLICY "admin_full_access" ON public.%I 
            FOR ALL TO authenticated 
            USING (public.check_is_admin()) 
            WITH CHECK (public.check_is_admin())', t);
            
        -- Standard SELECT policy for all authenticated users (Read-Only)
        -- Only if it doesn't already have one
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'select_all_authenticated') THEN
            EXECUTE format('CREATE POLICY "select_all_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
        END IF;

        RAISE NOTICE 'RLS Harmony applied to table: %', t;
    END LOOP;
END $$;

-- 4. VIEW PERMISSIONS (Final check)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. SPECIFIC FIX FOR 'importations' and 'dossiers'
-- Ensure they are views
DROP VIEW IF EXISTS public.importations CASCADE;
DROP TABLE IF EXISTS public.importations CASCADE;
DROP VIEW IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.dossiers CASCADE;

-- Shell views to allow ALTER (will be populated by compatibility migrations)
CREATE OR REPLACE VIEW public.importations AS SELECT 1 as id;
CREATE OR REPLACE VIEW public.dossiers AS SELECT 1 as id;

ALTER VIEW public.importations OWNER TO postgres;
ALTER VIEW public.dossiers OWNER TO postgres;

RAISE NOTICE 'SIHG Backend Harmony Migration Completed.';

Erreur : Échec de l’exécution de requête SQL : ERREUR : 42601 : erreur de syntaxe à ou près de « VIEWS » LIGNE 111 : ACCORDER LA SÉLECTION SUR TOUTES LES VUES DANS LE SCHÉMA publique VERS authentifiée ; ^