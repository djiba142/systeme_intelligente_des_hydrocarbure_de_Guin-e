-- ==============================================================================
-- MIGRATION: RLS Séquentiel Strict pour dossiers_entreprise
-- Objectif: Interdire la lecture et modification prématurées des dossiers
-- ==============================================================================

-- 1. Nettoyer les anciennes politiques globales peu sécurisées
DROP POLICY IF EXISTS "dos_select_all" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_dsa" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_da" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_dj" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_dg" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_etat" ON public.dossiers_entreprise;
DROP POLICY IF EXISTS "dos_update_sg" ON public.dossiers_entreprise;

-- ==============================================================================
-- POLITIQUES SELECT (Visibilité Entonnoir)
-- ==============================================================================

-- 2.1 Visibilité Totale (Super Admin, Réception, Secrétariat Direction)
CREATE POLICY "dos_select_unrestricted" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'agent_reception', 'secretariat_direction'))
);

-- 2.2 Visibilité Entreprises (Voir uniquement ses propres dossiers)
CREATE POLICY "dos_select_entreprise" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  entreprise_id IN (SELECT entreprise_id FROM profiles WHERE id = auth.uid() AND entreprise_id IS NOT NULL)
);

-- 2.3 Visibilité DSA (>= numerise)
CREATE POLICY "dos_select_dsa" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_aval', 'chef_service_aval', 'agent_technique_aval'))
  AND statut >= 'numerise'::dossier_statut
);

-- 2.4 Visibilité DA (>= valide_tech)
CREATE POLICY "dos_select_da" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire'))
  AND statut >= 'valide_tech'::dossier_statut
);

-- 2.5 Visibilité DJC (>= valide_admin)
CREATE POLICY "dos_select_djc" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_juridique', 'juriste', 'charge_conformite'))
  AND statut >= 'valide_admin'::dossier_statut
);

-- 2.6 Visibilité DG (>= valide_jur)
CREATE POLICY "dos_select_dg" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_general', 'directeur_adjoint'))
  AND statut >= 'valide_jur'::dossier_statut
);

-- 2.7 Visibilité ETAT (>= avis_dg)
CREATE POLICY "dos_select_etat" ON public.dossiers_entreprise FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_central', 'admin_etat'))
  AND statut >= 'avis_dg'::dossier_statut
);

-- ==============================================================================
-- POLITIQUES UPDATE (Blocage modification hors phase)
-- ==============================================================================

-- 3.1 UPDATE DSA (uniquement si statut est numerise ou en_analyse_tech)
CREATE POLICY "dos_update_dsa_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_aval', 'chef_service_aval', 'agent_technique_aval'))
  AND statut IN ('numerise'::dossier_statut, 'en_analyse_tech'::dossier_statut)
);

-- 3.2 UPDATE DA 
CREATE POLICY "dos_update_da_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire'))
  AND statut IN ('valide_tech'::dossier_statut, 'en_analyse_admin'::dossier_statut)
);

-- 3.3 UPDATE DJC
CREATE POLICY "dos_update_dj_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_juridique', 'juriste', 'charge_conformite'))
  AND statut IN ('valide_admin'::dossier_statut, 'en_analyse_jur'::dossier_statut)
);

-- 3.4 UPDATE DG
CREATE POLICY "dos_update_dg_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_general', 'directeur_adjoint'))
  AND statut = 'valide_jur'::dossier_statut
);

-- 3.5 UPDATE SG
CREATE POLICY "dos_update_sg_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('secretariat_direction'))
  AND statut IN ('valide_jur'::dossier_statut, 'avis_dg'::dossier_statut)
);

-- 3.6 UPDATE ETAT
CREATE POLICY "dos_update_etat_strict" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_central', 'admin_etat'))
  AND statut = 'avis_dg'::dossier_statut
);

-- 3.7 UPDATE SUPER ADMIN (Peut tout débloquer)
CREATE POLICY "dos_update_superadmin" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);
