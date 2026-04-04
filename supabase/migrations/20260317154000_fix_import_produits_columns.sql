-- Ajout des colonnes manquantes à la table import_produits
ALTER TABLE public.import_produits 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'carburant',
ADD COLUMN IF NOT EXISTS densite DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'actif';

-- Assurer que RLS est actif et permet l'accès aux rôles concernés
DROP POLICY IF EXISTS "Produits access policy" ON public.import_produits;
CREATE POLICY "Produits access policy" ON public.import_produits
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'directeur_importation', 'agent_importation')
        )
    );
