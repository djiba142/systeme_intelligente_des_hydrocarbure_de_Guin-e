-- ==============================================================================
-- SYSTÈME DE GESTION DES DOSSIERS (SIHG) - WORKFLOW GLOBAL
-- Philosophie : "Un dossier = un cycle de vie complet, visible et traçable par tous."
--
-- WORKFLOW : 
-- Agent Courrier → DSA → DA → DJ → DG (Avis) → Admin Central (Validation Finale)
-- ==============================================================================

-- 0. ACTIVER L'EXTENSION moddatetime (REQUIS pour le trigger auto updated_at)
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- 1. ENUMS (États du Workflow)
DO $$ BEGIN
    CREATE TYPE dossier_statut AS ENUM (
        'recu',               -- Agent Courrier (Réception)
        'numerise',           -- Agent Courrier (Scans terminés)
        'en_analyse_tech',    -- DSA (Analyse technique en cours)
        'valide_tech',        -- DSA (Validation technique)
        'en_analyse_admin',   -- DA (Analyse administrative en cours)
        'valide_admin',       -- DA (Validation administrative)
        'en_analyse_jur',     -- DJ (Analyse juridique en cours)
        'valide_jur',         -- DJ (Validation juridique)
        'avis_dg',            -- DG (Avis interne rendu)
        'approuve',           -- Admin Central (Validation Finale État)
        'rejete'              -- (Rejet par un acteur)
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dossier_type_doc AS ENUM (
        'registre_commerce',
        'nif',
        'statuts',
        'demande_signee',
        'autre'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE CENTRALE : DOSSIERS
CREATE TABLE IF NOT EXISTS public.dossiers_entreprise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dossier TEXT UNIQUE NOT NULL,
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    type_dossier TEXT NOT NULL,
    statut public.dossier_statut DEFAULT 'recu',
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLE : DOCUMENTS PDF BINDÉS AU DOSSIER
CREATE TABLE IF NOT EXISTS public.dossier_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID REFERENCES public.dossiers_entreprise(id) ON DELETE CASCADE,
    type_document public.dossier_type_doc NOT NULL,
    nom_fichier TEXT NOT NULL,
    url_pdf TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLE : HISTORIQUE ET TRAÇABILITÉ (Audit Log Inaltérable)
CREATE TABLE IF NOT EXISTS public.dossier_historique (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID REFERENCES public.dossiers_entreprise(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    statut_precedent public.dossier_statut,
    nouveau_statut public.dossier_statut,
    acteur_id UUID REFERENCES auth.users(id),
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- POLITIQUES DE SÉCURITÉ (RLS)
-- ==============================================================================

ALTER TABLE public.dossiers_entreprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_historique ENABLE ROW LEVEL SECURITY;

-- CONSULTATION GÉNÉRALE (TOUS voient tout)
CREATE POLICY "dos_select_all" ON public.dossiers_entreprise FOR SELECT TO authenticated USING (true);
CREATE POLICY "doc_select_all" ON public.dossier_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "hist_select_all" ON public.dossier_historique FOR SELECT TO authenticated USING (true);

-- CRÉATION DOSSIER (Agent Réception + Super Admin)
CREATE POLICY "dos_insert_reception" ON public.dossiers_entreprise FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('agent_reception', 'super_admin')));

CREATE POLICY "doc_insert_reception" ON public.dossier_documents FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('agent_reception', 'super_admin')));

-- HISTORIQUE (Tous les acteurs peuvent y écrire)
CREATE POLICY "hist_insert_all" ON public.dossier_historique FOR INSERT TO authenticated WITH CHECK (true);

-- ÉVOLUTION DU STATUT (UPDATE par rôle)
CREATE POLICY "dos_update_dsa" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'super_admin')));

CREATE POLICY "dos_update_da" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire', 'super_admin')));

CREATE POLICY "dos_update_dj" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_juridique', 'juriste', 'charge_conformite', 'super_admin')));

CREATE POLICY "dos_update_dg" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('directeur_general', 'directeur_adjoint', 'super_admin')));

-- Secrétaire Général : Peut préparer et transmettre
CREATE POLICY "dos_update_sg" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('secretariat_direction', 'super_admin')));

CREATE POLICY "dos_update_etat" ON public.dossiers_entreprise FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_central', 'super_admin')));

-- 5. TRIGGER POUR updated_at (utilise l'extension moddatetime activée ci-dessus)
DROP TRIGGER IF EXISTS handle_updated_at_dossiers ON public.dossiers_entreprise;
CREATE TRIGGER handle_updated_at_dossiers BEFORE UPDATE ON public.dossiers_entreprise
FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
