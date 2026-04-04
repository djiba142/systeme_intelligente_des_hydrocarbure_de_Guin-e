-- ==========================================
-- RESCUE SCRIPT v4.0 - TOTAL SYSTEM RECOVERY
-- ==========================================
-- 1. Sync all roles in ENUM
-- 2. Enforce Unique Role per User (Fixes maybeSingle() failure)
-- 3. Repair All Profiles & Roles
-- 4. Open All RLS for Authentication/Authorization

DO $$
DECLARE
    u RECORD;
    v_role_meta text;
    v_full_name text;
    v_roles text[] := ARRAY[
        'super_admin', 'admin_etat', 'admin_central', 'chef_regulation', 'analyste_regulation',
        'directeur_general', 'directeur_adjoint', 'secretariat_direction',
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux',
        'inspecteur', 'service_it', 'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
        'directeur_importation', 'agent_importation', 'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire',
        'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique',
        'technicien_aval', 'agent_reception', 'analyste', 'responsable_entreprise', 'gestionnaire_station',
        'superviseur_aval', 'personnel_admin', 'directeur_financier', 'gestionnaire'
    ];
    r text;
BEGIN
    -- STEP 1: ENUM SYNC
    FOR r IN SELECT unnest(v_roles) LOOP
        BEGIN
            EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''' || r || '''';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END LOOP;

    -- STEP 2: CLEANUP DUPLICATES AND ENFORCE UNIQUE ROLE
    -- Remove the old non-unique constraint if it exists
    ALTER TABLE IF EXISTS public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
    
    -- Delete duplicates (keep only one role per user)
    DELETE FROM public.user_roles a USING (
      SELECT MIN(ctid) as ctid, user_id
      FROM public.user_roles 
      GROUP BY user_id HAVING COUNT(*) > 1
    ) b
    WHERE a.user_id = b.user_id AND a.ctid <> b.ctid;

    -- Add unique constraint on user_id ONLY
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_unique'
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
    END IF;
    
    -- STEP 3: REPAIR USERS
    FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        
        v_role_meta := LOWER(COALESCE(u.raw_user_meta_data->>'role', 'gestionnaire'));
        v_full_name := COALESCE(u.raw_user_meta_data->>'full_name', u.email);

        -- Profile UPSERT
        INSERT INTO public.profiles (user_id, email, full_name, organisation, poste)
        VALUES (u.id, u.email, v_full_name, u.raw_user_meta_data->>'organisation', u.raw_user_meta_data->>'poste')
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            organisation = COALESCE(EXCLUDED.organisation, profiles.organisation),
            poste = COALESCE(EXCLUDED.poste, profiles.poste);

        -- Role UPSERT (Now safe because of unique constraint)
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (u.id, v_role_meta::public.app_role)
            ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (u.id, 'gestionnaire')
            ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
        END;

    END LOOP;

    -- STEP 4: BLUNT RLS FIX
    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Public Full Access" ON public.profiles;
    CREATE POLICY "Public Full Access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public Full Access" ON public.user_roles;
    CREATE POLICY "Public Full Access" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    -- STEP 5: DEBUG LOG
    BEGIN
        INSERT INTO public.audit_logs (user_email, action_type, status, details)
        VALUES (
            'system@sihg.gn', 
            'RESCUE_V4.0', 
            'success', 
            jsonb_build_object('message', 'System Repaired and Deduplicated Successfully', 'version', '4.0')
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Audit log failed, but rescue continued.';
    END;

    RAISE NOTICE 'RESCUE SUCCESSFUL - v4.0 applied';

END $$;
