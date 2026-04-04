-- Migration: Correction des permissions pour les ordres de ravitaillement (DSA / SONAP)
-- Date: 2026-03-18
-- Problème: Les administrateurs SONAP (Directeur Aval, etc.) ne pouvaient pas émettre d'ordres car l'accès était limité aux super_admin ou responsable_entreprise.

BEGIN;

-- 1. Mise à jour de la fonction can_access_level pour inclure la nouvelle hiérarchie SONAP
CREATE OR REPLACE FUNCTION public.can_access_level(_user_id UUID, _required_level public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_text TEXT;
BEGIN
  SELECT role::text INTO user_role_text FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  -- Super Admin a tous les accès
  IF user_role_text = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Les directeurs et administrateurs d'état ont accès aux niveaux privilégiés
  IF user_role_text IN ('admin_etat', 'directeur_general', 'directeur_adjoint', 'directeur_aval', 'directeur_importation', 'directeur_logistique', 'directeur_juridique', 'directeur_administratif', 'service_it') THEN
    RETURN TRUE;
  END IF;
  
  -- Cas spécifique pour responsable_entreprise (niveau le plus bas si non privilégié)
  IF user_role_text = 'responsable_entreprise' AND _required_level::text = 'responsable_entreprise' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 2. Ajout de politiques spécifiques pour ordres_livraison pour permettre l'émission d'ordres par la SONAP
DROP POLICY IF EXISTS "SONAP managers can manage all orders" ON public.ordres_livraison;
CREATE POLICY "SONAP managers can manage all orders"
ON public.ordres_livraison FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN (
      'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 
      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval'
    )
  )
)
WITH CHECK (true);

-- 3. S'assurer que les entreprises peuvent toujours voir et mettre à jour leurs ordres (sécurité supplémentaire)
DROP POLICY IF EXISTS "Responsable can view their company orders" ON public.ordres_livraison;
CREATE POLICY "Responsable can view their company orders"
ON public.ordres_livraison FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Responsable can update their company orders" ON public.ordres_livraison;
CREATE POLICY "Responsable can update their company orders"
ON public.ordres_livraison FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
);

COMMIT;