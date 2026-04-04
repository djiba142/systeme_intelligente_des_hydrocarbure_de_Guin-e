-- FORCE ADMIN ACCESS FOR SPECIFIC ACCOUNT
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- 1. Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@nexus.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User admin@nexus.com not found in auth.users';
    ELSE
        -- 2. Ensure Profile exists
        INSERT INTO public.profiles (user_id, email, full_name, organisation, poste)
        VALUES (v_user_id, 'admin@nexus.com', 'Administrateur Nexus', 'SONAP', 'Super Admin')
        ON CONFLICT (user_id) DO UPDATE 
        SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

        -- 3. Force Super Admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE 
        SET role = EXCLUDED.role;
        
        RAISE NOTICE 'Access FORCED to super_admin for admin@nexus.com (ID: %)', v_user_id;
    END IF;
END $$;
