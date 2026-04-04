-- Supprimer TOUTES les anciennes politiques sur dossiers (nettoyage complet)
DROP POLICY IF EXISTS "Admins SONAP can view all dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Super admins and directors can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Super admin can manage all dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Dossiers access for all workflow users" ON public.dossiers;
DROP POLICY IF EXISTS "Agent reception can insert dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Agent reception can view dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Agent reception can update recu dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Dossiers select for workflow" ON public.dossiers;
DROP POLICY IF EXISTS "Dossiers insert for reception" ON public.dossiers;
DROP POLICY IF EXISTS "Dossiers update for workflow" ON public.dossiers;

-- Tout supprimer dynamiquement
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'dossiers' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dossiers', pol.policyname);
  END LOOP;
END $$;

-- 1. Ajouter le rôle agent_reception à l'ENUM
DO $$
BEGIN
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'agent_reception';
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;
END $$;

-- 2. Ajouter colonnes de réception à la table dossiers
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS type_dossier TEXT DEFAULT 'agrement';
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS recu_par UUID REFERENCES auth.users(id);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS date_reception TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS documents_scannes JSONB DEFAULT '[]';

-- 3. Recréer les politiques proprement

-- SELECT: Tous les acteurs du workflow
CREATE POLICY "dossiers_select_workflow" ON public.dossiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN (
          'agent_reception', 'super_admin', 'service_it',
          'secretariat_direction', 'directeur_general', 'directeur_adjoint',
          'admin_etat', 'directeur_aval', 'directeur_adjoint_aval',
          'chef_service_aval', 'agent_technique_aval', 'chef_division_distribution',
          'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire',
          'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique'
        )
    )
  );

-- INSERT: Seul l'agent_reception (et super_admin) peut créer
CREATE POLICY "dossiers_insert_reception" ON public.dossiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('agent_reception', 'super_admin')
    )
  );

-- UPDATE: Agent reception limité, les directeurs font le reste
CREATE POLICY "dossiers_update_workflow" ON public.dossiers
  FOR UPDATE TO authenticated
  USING (
    (statut IN ('recu', 'numerise') AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text = 'agent_reception'
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint',
          'admin_etat', 'secretariat_direction',
          'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval',
          'directeur_administratif', 'chef_service_administratif',
          'directeur_juridique', 'juriste', 'charge_conformite'
        )
    )
  );

-- 4. RLS user_roles
DROP POLICY IF EXISTS "insert_user_roles" ON public.user_roles;
CREATE POLICY "insert_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction',
          'service_it', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution',
          'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique',
          'directeur_administratif', 'chef_service_administratif'
        )
    )
  );
