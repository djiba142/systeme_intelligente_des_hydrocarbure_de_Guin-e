-- Migration: SIHG SONAP - Nouveaux Rôles et Workflow Direction Générale
-- Date: 2026-03-18

-- 1. Ajout des nouveaux rôles dans ENUM app_role (Migration sécurisée)
DO $$
BEGIN
    -- Direction Générale & Secretariat
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'secretariat_direction') THEN
        ALTER TYPE public.app_role ADD VALUE 'secretariat_direction';
    END IF;

    -- Direction des Services Aval (DSA)
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_aval') THEN
        ALTER TYPE public.app_role ADD VALUE 'directeur_aval';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_adjoint_aval') THEN
        ALTER TYPE public.app_role ADD VALUE 'directeur_adjoint_aval';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'chef_division_distribution') THEN
        ALTER TYPE public.app_role ADD VALUE 'chef_division_distribution';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'chef_service_aval') THEN
        ALTER TYPE public.app_role ADD VALUE 'chef_service_aval';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_technique_aval') THEN
        ALTER TYPE public.app_role ADD VALUE 'agent_technique_aval';
    END IF;

    -- Direction Administrative (DA)
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_administratif') THEN
        ALTER TYPE public.app_role ADD VALUE 'directeur_administratif';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'chef_service_administratif') THEN
        ALTER TYPE public.app_role ADD VALUE 'chef_service_administratif';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_administratif') THEN
        ALTER TYPE public.app_role ADD VALUE 'agent_administratif';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'gestionnaire_documentaire') THEN
        ALTER TYPE public.app_role ADD VALUE 'gestionnaire_documentaire';
    END IF;
END
$$;

-- 2. Migration des anciens rôles vers les nouveaux
-- superviseur_aval -> directeur_aval
UPDATE public.user_roles SET role = 'directeur_aval' WHERE role::text = 'superviseur_aval';
-- personnel_admin -> agent_administratif
UPDATE public.user_roles SET role = 'agent_administratif' WHERE role::text = 'personnel_admin';

-- 3. Mise à jour des politiques RLS globales (user_roles)
-- On remplace les anciennes politiques pour inclure la hiérarchie complète
DROP POLICY IF EXISTS "insert_user_roles" ON public.user_roles;
CREATE POLICY "insert_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'directeur_aval', 'directeur_adjoint_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique', 'directeur_administratif', 'secretariat_direction'
        )
    )
  );

DROP POLICY IF EXISTS "update_user_roles" ON public.user_roles;
CREATE POLICY "update_user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'directeur_aval', 'directeur_adjoint_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique', 'directeur_administratif', 'secretariat_direction'
        )
    )
  );

-- 4. Politiques RLS Dossiers Administratifs
-- Mise à jour pour les nouveaux statuts et rôles
DROP POLICY IF EXISTS "Admins SONAP can view all dossiers" ON public.dossiers;
CREATE POLICY "Admins SONAP can view all dossiers" ON public.dossiers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN (
                'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 
                'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval',
                'chef_service_aval', 'agent_technique_aval', 'directeur_juridique', 'juriste', 
                'directeur_administratif', 'chef_service_administratif', 'agent_administratif',
                'service_it'
            )
        )
    );

-- 5. Autorisations de validation par direction (Policies distinctes)
DROP POLICY IF EXISTS "DSA can validate dossiers" ON public.dossiers;
CREATE POLICY "DSA can validate dossiers" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval')
        )
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "DA can validate dossiers" ON public.dossiers;
CREATE POLICY "DA can validate dossiers" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('directeur_administratif', 'chef_service_administratif')
        )
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "DG can validate dossiers" ON public.dossiers;
CREATE POLICY "DG can validate dossiers" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('directeur_general', 'directeur_adjoint')
        )
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "DJC can validate dossiers" ON public.dossiers;
CREATE POLICY "DJC can validate dossiers" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('directeur_juridique', 'juriste', 'charge_conformite')
        )
    )
    WITH CHECK (true);

-- 6. Mise à jour des statuts par défaut pour les dossiers
ALTER TABLE public.dossiers ALTER COLUMN statut SET DEFAULT 'numerise';
-- On migre les anciens statuts vers les nouveaux (numerise est le point de départ)
UPDATE public.dossiers SET statut = 'numerise' WHERE statut = 'attente_dsa';

-- Permettre la création de dossier sans entité_id (ex: nouvelle entreprise)
ALTER TABLE public.dossiers ALTER COLUMN entite_id DROP NOT NULL;
