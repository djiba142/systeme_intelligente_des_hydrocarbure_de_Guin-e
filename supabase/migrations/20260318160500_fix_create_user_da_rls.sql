BEGIN;

-- FIX RLS POUR LA CREATION D'UTILISATEURS (Ajout du Directeur Administratif)

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

DROP POLICY IF EXISTS "update_user_roles" ON public.user_roles;
CREATE POLICY "update_user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
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

DROP POLICY IF EXISTS "delete_user_roles" ON public.user_roles;
CREATE POLICY "delete_user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
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

DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
CREATE POLICY "insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
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

DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
CREATE POLICY "update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
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

COMMIT;
