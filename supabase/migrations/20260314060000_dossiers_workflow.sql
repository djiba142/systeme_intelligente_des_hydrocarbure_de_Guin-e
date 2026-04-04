
-- Migration: Workflow Dossiers et Sécurité Intelligente SONAP
-- Date: 2026-03-14

-- 1. Table des dossiers administratifs (SIHG-Dossiers)
CREATE TABLE IF NOT EXISTS public.dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dossier TEXT UNIQUE NOT NULL,
    type_demande TEXT NOT NULL, -- 'ouverture_station', 'agrement_entreprise', 'renouvellement_licence'
    entite_id UUID NOT NULL, -- ID de la station ou de l'entreprise
    entite_type TEXT NOT NULL, -- 'station' ou 'entreprise'
    entite_nom TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'attente_dsa', -- 'attente_dsa', 'attente_dla', 'attente_djc', 'attente_dsi', 'valide', 'rejete'
    priorite TEXT DEFAULT 'normale',
    observations TEXT,
    pieces_jointes JSONB DEFAULT '[]', -- Liste des URLs des documents (RCCM, Plan, etc.)
    qr_code_url TEXT,
    date_soumission TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valide_par_dsa UUID REFERENCES auth.users(id),
    valide_par_dla UUID REFERENCES auth.users(id),
    valide_par_djc UUID REFERENCES auth.users(id),
    valide_par_dsi UUID REFERENCES auth.users(id)
);

-- 2. Activation du RLS sur les dossiers
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS (Lecture pour tous les admins SONAP)
CREATE POLICY "Admins SONAP can view all dossiers" ON public.dossiers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'admin_etat', 'superviseur_aval', 'personnel_admin', 'directeur_juridique', 'juriste', 'service_it')
        )
    );

-- 4. Fonctions pour la sécurité intelligente

-- Détection de fraude (Écart de stock vs ventes)
CREATE OR REPLACE FUNCTION public.detecter_fraude_station(station_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    dernier_stock_essence NUMERIC;
    somme_ventes_essence NUMERIC;
    livraisons_essence NUMERIC;
    ecart NUMERIC;
BEGIN
    -- Récupérer le dernier stock connu
    SELECT stock_essence INTO dernier_stock_essence FROM public.stations WHERE id = station_uuid;
    
    -- Exemple simplifié: Somme des ventes vs Entrées/Sorties sur les 24h
    -- (À affiner avec une vraie table de ventes journalières)
    RETURN FALSE; -- Placeholder
END;
$$ LANGUAGE plpgsql;

-- 5. Ajout de colonnes de suivi sur les stations
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS certificat_url TEXT;

-- 6. Mise à jour des déclencheurs pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dossiers_updated_at 
    BEFORE UPDATE ON public.dossiers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
