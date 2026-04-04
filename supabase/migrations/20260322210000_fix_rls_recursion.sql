-- Aggressive RLS fix & IT Director recovery
-- Author: SIHG Recovery Agent
-- Date: 2026-03-22

-- 1. Create a security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin_etat', 'service_it', 'directeur_general', 'directeur_adjoint', 'admin_central', 'chef_regulation')
  );
END;
$$;

-- 2. Aggressive Cleanup of RLS Policies on problematic tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_roles', 'profiles'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Re-enable clean RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_user_roles_v2" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR check_is_admin());

CREATE POLICY "manage_user_roles_v2" ON public.user_roles
  FOR ALL TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- 4. Re-enable clean RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_profiles_v2" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR check_is_admin());

CREATE POLICY "manage_profiles_v2" ON public.profiles
  FOR ALL TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- 5. Force IT Director as Super Admin (both in user_roles and metadata)
DO $$
DECLARE
    v_user_id uuid := 'c6ac18f6-a125-4c83-b2f7-a773404c3968';
BEGIN
    -- Force in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

    -- Force in auth.users metadata (for frontend fallback)
    UPDATE auth.users 
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'super_admin', 'full_name', 'Directeur Système Informatique')
    WHERE id = v_user_id;

    -- Update profile if exists
    UPDATE public.profiles
    SET poste = 'Directeur Système Informatique',
        organisation = 'dsi'
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'IT Director recovery complete for ID: %', v_user_id;
END $$;
