-- ================================================
-- TABLES POUR L'ANALYSE STRATÉGIQUE (CAS)
-- ================================================

-- 1. Table des prix officiels (régulés par l'État)
CREATE TABLE IF NOT EXISTS prix_officiels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    prix_litre NUMERIC NOT NULL,
    date_effet TIMESTAMPTZ DEFAULT now(),
    cree_par UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table historique des stocks (pour les graphiques d'évolution)
CREATE TABLE IF NOT EXISTS historique_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_releve DATE DEFAULT CURRENT_DATE,
    stock_essence NUMERIC DEFAULT 0,
    stock_gasoil NUMERIC DEFAULT 0,
    stock_gpl NUMERIC DEFAULT 0,
    nombre_stations INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date_releve)
);

-- 3. Table des importations (Navires)
CREATE TABLE IF NOT EXISTS importations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navire_nom TEXT NOT NULL,
    produit TEXT NOT NULL CHECK (produit IN ('essence', 'gasoil', 'jet_a1', 'mazout', 'gpl')),
    quantite_tonnes NUMERIC NOT NULL,
    port_origine TEXT,
    port_destination TEXT DEFAULT 'Conakry',
    date_depart DATE,
    date_arrivee_prevue DATE,
    date_arrivee_reelle DATE,
    statut TEXT DEFAULT 'en_mer' CHECK (statut IN ('en_mer', 'au_port', 'en_dechargement', 'termine', 'annule')),
    entreprise_id UUID REFERENCES entreprises(id), -- Optionnel: si importé par une compagnie spécifique
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE prix_officiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE importations ENABLE ROW LEVEL SECURITY;

-- Permissions de lecture pour ANALYSTE et ADMINS
CREATE POLICY "Lecture Stratégique pour Analystes et Admins" 
ON prix_officiels FOR SELECT 
TO authenticated 
USING (true); -- Public ou restreint aux rôles ? (Doc dit lecture globale pour Analyste)

CREATE POLICY "Lecture Historique Stocks" 
ON historique_stocks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Lecture Importations" 
ON importations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'analyste')
    )
);

-- Permissions de GESTION (SONAP uniquement)
CREATE POLICY "Gestion des Prix Officiels" 
ON prix_officiels FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint')
    )
);

CREATE POLICY "Gestion des Importations" 
ON importations FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'superviseur_aval', 'operateur_aval')
    )
);
