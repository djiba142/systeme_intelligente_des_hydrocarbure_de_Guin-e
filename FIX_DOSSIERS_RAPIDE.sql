-- Copiez et collez ce code dans le SQL Editor de Supabase pour recréer la table "dossiers" manquante.

BEGIN;

-- 1. Création de la table des dossiers administratifs (SIHG-Dossiers)
CREATE TABLE IF NOT EXISTS public.dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dossier TEXT UNIQUE NOT NULL,
    type_dossier TEXT DEFAULT 'agrement',
    type_demande TEXT NOT NULL, 
    entite_id UUID NOT NULL, 
    entite_type TEXT NOT NULL, 
    entite_nom TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'attente_dsa', 
    priorite TEXT DEFAULT 'normale',
    observations TEXT,
    pieces_jointes JSONB DEFAULT '[]', 
    documents_scannes JSONB DEFAULT '[]',
    qr_code_url TEXT,
    recu_par UUID REFERENCES auth.users(id),
    date_reception TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    date_soumission TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valide_par_dsa UUID REFERENCES auth.users(id),
    valide_par_dla UUID REFERENCES auth.users(id),
    valide_par_djc UUID REFERENCES auth.users(id),
    valide_par_dsi UUID REFERENCES auth.users(id)
);

-- 2. Activation du RLS sur les dossiers
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

-- 3. Nettoyer les anciennes règles de sécurité s'il en existe
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

-- 4. Créer les nouvelles règles de sécurité
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

CREATE POLICY "dossiers_insert_reception" ON public.dossiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('agent_reception', 'super_admin')
    )
  );

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

-- 5. Trigger pour mettre à jour la date automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dossiers_updated_at ON public.dossiers;
CREATE TRIGGER update_dossiers_updated_at 
    BEFORE UPDATE ON public.dossiers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
