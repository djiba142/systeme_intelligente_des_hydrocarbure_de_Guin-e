-- ================================================
-- MODULE FINANCIER (DAF) - SIHG v2.0
-- Gestion des budgets, fournisseurs, factures et paiements
-- ================================================

-- 1. Ajout des rôles DAF dans l'ENUM app_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_financier') THEN
    ALTER TYPE public.app_role ADD VALUE 'directeur_financier';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'controleur_financier') THEN
    ALTER TYPE public.app_role ADD VALUE 'controleur_financier';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'comptable') THEN
    ALTER TYPE public.app_role ADD VALUE 'comptable';
  END IF;
END $$;

-- 2. Table des Budgets Annuels
CREATE TABLE IF NOT EXISTS public.finance_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annee INTEGER NOT NULL,
    direction TEXT NOT NULL, -- 'importation', 'logistique', 'aval', 'rh', 'dsi', 'dg', 'daf'
    montant_alloue DECIMAL(20,2) NOT NULL DEFAULT 0,
    montant_utilise DECIMAL(20,2) NOT NULL DEFAULT 0,
    devise TEXT NOT NULL DEFAULT 'GNF',
    statut TEXT NOT NULL DEFAULT 'planifié', -- 'planifié', 'approuvé', 'ajusté', 'clôturé'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Table des Fournisseurs
CREATE TABLE IF NOT EXISTS public.finance_fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    pays TEXT DEFAULT 'Guinée',
    adresse TEXT,
    contact_nom TEXT,
    contact_email TEXT,
    contact_tel TEXT,
    type_fournisseur TEXT, -- 'international', 'local', 'service', 'logistique'
    banque_infos JSONB, -- { "banque": "", "rib": "", "swift": "" }
    statut TEXT DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Table des Factures
CREATE TABLE IF NOT EXISTS public.finance_factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_facture TEXT NOT NULL UNIQUE,
    fournisseur_id UUID REFERENCES public.finance_fournisseurs(id),
    direction_id TEXT, -- lié à direction dans finance_budgets
    montant_ht DECIMAL(20,2) NOT NULL,
    tva DECIMAL(20,2) DEFAULT 0,
    montant_ttc DECIMAL(20,2) NOT NULL,
    devise TEXT DEFAULT 'GNF',
    date_emission DATE NOT NULL,
    date_echeance DATE,
    objet TEXT NOT NULL,
    document_url TEXT,
    statut TEXT DEFAULT 'brouillon', -- 'brouillon', 'en_attente_controle', 'valide_daf', 'paye', 'rejete'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Table des Paiements
CREATE TABLE IF NOT EXISTS public.finance_paiements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_id UUID REFERENCES public.finance_factures(id),
    montant_paye DECIMAL(20,2) NOT NULL,
    devise TEXT DEFAULT 'GNF',
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT now(),
    mode_paiement TEXT NOT NULL, -- 'virement', 'transfert_int', 'cash', 'cheque'
    reference_transaction TEXT,
    statut TEXT DEFAULT 'effectué',
    valide_par UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Activations RLS
ALTER TABLE public.finance_budgets ENABLE CONTROL;
ALTER TABLE public.finance_fournisseurs ENABLE CONTROL;
ALTER TABLE public.finance_factures ENABLE CONTROL;
ALTER TABLE public.finance_paiements ENABLE CONTROL;

-- 7. Politiques RLS (Simplifiées pour le MVP DAF)
-- Seuls les rôles DAF et Super Admin peuvent voir/gérer les finances
CREATE POLICY "Finance users can manage budgets" ON public.finance_budgets
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_financier', 'controleur_financier')));

CREATE POLICY "Finance users can manage suppliers" ON public.finance_fournisseurs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_financier', 'comptable')));

CREATE POLICY "Finance users can manage invoices" ON public.finance_factures
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_financier', 'controleur_financier', 'comptable')));

CREATE POLICY "Finance users can manage payments" ON public.finance_paiements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_financier', 'comptable')));

-- 8. Mise à jour automatique de montant_utilise dans les budgets lors du marquage d'une facture comme payée
CREATE OR REPLACE FUNCTION public.update_budget_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.statut = 'paye' AND (OLD.statut IS NULL OR OLD.statut != 'paye')) THEN
        UPDATE public.finance_budgets
        SET montant_utilise = montant_utilise + NEW.montant_ttc,
            updated_at = now()
        WHERE direction = NEW.direction_id 
          AND annee = EXTRACT(YEAR FROM NEW.date_emission);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_usage
AFTER UPDATE ON public.finance_factures
FOR EACH ROW EXECUTE FUNCTION public.update_budget_usage();
