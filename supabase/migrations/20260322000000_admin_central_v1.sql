-- ==========================================
-- SIHG : MODULE RÉGULATION & QUOTAS v1.0
-- ==========================================

BEGIN;

-- 1. Mise à jour des rôles (Enum app_role)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('super_admin', 'admin_etat'); -- Fallback
    END IF;
    
    -- Ajout sécurisé des nouveaux rôles
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin_central';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'chef_regulation';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'analyste_regulation';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table des Quotas
CREATE TABLE IF NOT EXISTS regulation_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    produit TEXT NOT NULL, -- essence, gasoil, jet_a1, gpl
    quantite NUMERIC NOT NULL DEFAULT 0,
    quantite_utilisee NUMERIC NOT NULL DEFAULT 0,
    periode TEXT NOT NULL, -- Format YYYY-MM
    statut TEXT NOT NULL DEFAULT 'en_analyse', -- en_analyse, propose, valide, publie, rejete
    propose_par UUID REFERENCES profiles(user_id),
    valide_par UUID REFERENCES profiles(user_id),
    publie_par UUID REFERENCES profiles(user_id),
    motif_rejet TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des Agréments
CREATE TABLE IF NOT EXISTS regulation_agrements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    numero TEXT UNIQUE NOT NULL,
    type_agrement TEXT NOT NULL, -- importation, distribution, stockage, transport
    date_emission DATE,
    date_expiration DATE,
    statut TEXT NOT NULL DEFAULT 'en_analyse',
    signe_par UUID REFERENCES profiles(user_id),
    motif_rejet TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des Licences
CREATE TABLE IF NOT EXISTS regulation_licences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    numero TEXT UNIQUE NOT NULL,
    type_licence TEXT NOT NULL, -- exploitation, distribution, importation, transport
    date_emission DATE NOT NULL,
    date_expiration DATE NOT NULL,
    statut TEXT NOT NULL DEFAULT 'active', -- active, suspendue, expiree, annulee
    delivre_par UUID REFERENCES profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table des Logs de Régulation (Audit)
CREATE TABLE IF NOT EXISTS regulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id),
    action TEXT NOT NULL,
    module TEXT NOT NULL, -- quotas, agrements, licences
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activation RLS
ALTER TABLE regulation_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_agrements ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_licences ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_logs ENABLE ROW LEVEL SECURITY;

-- 7. Politiques de sécurité (Exemple simplifié)
-- Lecture pour tous les rôles admin/reg
CREATE POLICY "Lecture Regulation" ON regulation_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture Agrements" ON regulation_agrements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture Licences" ON regulation_licences FOR SELECT TO authenticated USING (true);

-- Insertion/Update selon rôle (à affiner)
CREATE POLICY "Gestion Quotas Analyste" ON regulation_quotas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'analyste_regulation'));
CREATE POLICY "Gestion Quotas Admin" ON regulation_quotas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_central', 'super_admin')));

COMMIT;
