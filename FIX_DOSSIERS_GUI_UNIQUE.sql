-- ==============================================================================
-- MISE À JOUR - WORKFLOW DU GUICHET UNIQUE (RÉCEPTION -> DSA -> DA)
-- ==============================================================================

-- 1. Ajout des colonnes manquantes dans la table `dossiers_entreprise`
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE dossier_entreprise ADD COLUMN entite_nom TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
    
    BEGIN
        ALTER TABLE public.dossiers_entreprise ADD COLUMN type_demande TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- 2. Le statut utilise actuellement un ENUM (dossier_statut).
-- Pour permettre plus de flexibilité selon notre plan, on le convertit en TEXT.
ALTER TABLE public.dossiers_entreprise ALTER COLUMN statut TYPE TEXT USING statut::text;

-- Optionnel: Si vous aviez un default enum, on le met en format pur text.
ALTER TABLE public.dossiers_entreprise ALTER COLUMN statut SET DEFAULT 'recu';

-- 3. Sécurité (RLS) assouplie temporellement pour la phase de test du prototype.
-- Tous les utilisateurs connectés peuvent voir les dossiers, l'application frontend 
-- s'occupe du filtrage selon le profil connecte. L'Agent Reception peut insérer.
DROP POLICY IF EXISTS "dos_select_all" ON public.dossiers_entreprise;
CREATE POLICY "dos_select_all" ON public.dossiers_entreprise FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "doc_select_all" ON public.dossier_documents;
CREATE POLICY "doc_select_all" ON public.dossier_documents FOR SELECT TO authenticated USING (true);

-- Permettre la modification totale dans ce prototype pour la DSA, DA et Reception (update du status)
DROP POLICY IF EXISTS "dos_update_all_proto" ON public.dossiers_entreprise;
CREATE POLICY "dos_update_all_proto" ON public.dossiers_entreprise FOR UPDATE TO authenticated USING (true);

-- ==============================================================================
-- ASSURANCE QUE LE BUCKET EXISTE ET EST PUBLIC (Storage)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dossiers', 'dossiers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politique de storage pour permettre l'upload sans restriction des agents
DROP POLICY IF EXISTS "Permettre l'upload de pdf" ON storage.objects;
CREATE POLICY "Permettre l'upload de pdf" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'dossiers');

DROP POLICY IF EXISTS "Permettre la lecture publique de pdf" ON storage.objects;
CREATE POLICY "Permettre la lecture publique de pdf" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'dossiers');

-- Fin du script.
