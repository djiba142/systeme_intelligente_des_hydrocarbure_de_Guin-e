-- ====================================================================
-- SIHG MASTER UNIFIED SCHEMA v1.0
-- This script consolidates all previous migrations into a single, 
-- idempotent deployment for the "Importation to Station" workflow.
-- ====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'super_admin', 'admin_etat', 'admin_central', 'chef_regulation', 'analyste_regulation',
        'directeur_general', 'directeur_adjoint', 'secretariat_direction',
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux',
        'inspecteur', 'service_it', 'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
        'directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'agent_reception_port', 'analyste_approvisionnement',
        'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire',
        'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique',
        'technicien_aval', 'agent_reception', 'analyste', 'responsable_entreprise', 'gestionnaire_station',
        'superviseur_aval', 'personnel_admin', 'directeur_financier', 'gestionnaire'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sync roles for existing enum (Safety check)
DO $$
DECLARE
    r text;
    v_roles text[] := ARRAY[
        'super_admin', 'admin_etat', 'admin_central', 'chef_regulation', 'analyste_regulation',
        'directeur_general', 'directeur_adjoint', 'secretariat_direction',
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux',
        'inspecteur', 'service_it', 'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
        'directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'agent_reception_port', 'analyste_approvisionnement',
        'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire',
        'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique',
        'technicien_aval', 'agent_reception', 'analyste', 'responsable_entreprise', 'gestionnaire_station',
        'superviseur_aval', 'personnel_admin', 'directeur_financier', 'gestionnaire'
    ];
BEGIN
    FOR r IN SELECT unnest(v_roles) LOOP
        BEGIN
            EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''' || r || '''';
        EXCEPTION WHEN duplicate_object THEN null; END;
    END LOOP;
END $$;

DO $$ BEGIN
    CREATE TYPE tanker_status AS ENUM ('en_mer', 'arrive', 'en_controle', 'conforme', 'non_conforme', 'en_dechargement', 'decharge');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. BASIC INFRASTRUCTURE TABLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FORCE UNIQUE CONSTRAINT and CLEANUP
DO $$ BEGIN
    -- Delete duplicates if any
    DELETE FROM public.user_roles a USING (
      SELECT MIN(ctid) as ctid, user_id
      FROM public.user_roles 
      GROUP BY user_id HAVING COUNT(*) > 1
    ) b
    WHERE a.user_id = b.user_id AND a.ctid <> b.ctid;

    -- Add unique constraint
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_unique') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Unique constraint adjustment handled'; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    prenom TEXT,
    organisation TEXT,
    direction TEXT,
    poste TEXT,
    matricule TEXT,
    phone TEXT,
    sexe TEXT,
    date_naissance DATE,
    adresse TEXT,
    region TEXT,
    prefecture TEXT,
    commune TEXT,
    entreprise_id TEXT,
    station_id TEXT,
    avatar_url TEXT,
    force_password_change BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AUTH TRIGGER (Critical for User Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role public.app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (
    user_id, email, full_name, prenom, organisation, direction, poste, 
    matricule, phone, sexe, date_naissance, adresse, region, 
    prefecture, commune, entreprise_id, station_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'organisation',
    NEW.raw_user_meta_data->>'direction',
    NEW.raw_user_meta_data->>'poste',
    NEW.raw_user_meta_data->>'matricule',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'sexe',
    (NEW.raw_user_meta_data->>'date_naissance')::DATE,
    NEW.raw_user_meta_data->>'adresse',
    NEW.raw_user_meta_data->>'region',
    NEW.raw_user_meta_data->>'prefecture',
    NEW.raw_user_meta_data->>'commune',
    NEW.raw_user_meta_data->>'entreprise_id',
    NEW.raw_user_meta_data->>'station_id'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    prenom = COALESCE(EXCLUDED.prenom, profiles.prenom),
    organisation = COALESCE(EXCLUDED.organisation, profiles.organisation),
    poste = COALESCE(EXCLUDED.poste, profiles.poste);

  -- Handle Role
  v_role_text := NEW.raw_user_meta_data->>'role';
  IF v_role_text IS NOT NULL AND v_role_text != '' THEN
    BEGIN
      v_role := v_role_text::public.app_role;
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_role)
      ON CONFLICT (user_id) DO UPDATE SET role = v_role;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not assign role %', v_role_text;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.entreprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    sigle TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('compagnie', 'distributeur')),
    numero_agrement TEXT UNIQUE NOT NULL,
    region TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'ferme')),
    quota_essence INTEGER DEFAULT 0,
    quota_gasoil INTEGER DEFAULT 0,
    quota_gpl INTEGER DEFAULT 0,
    quota_lubrifiants INTEGER DEFAULT 0,
    logo_url TEXT,
    contact_nom TEXT,
    contact_telephone TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
    nom TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    adresse TEXT NOT NULL,
    ville TEXT NOT NULL,
    region TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    type TEXT NOT NULL CHECK (type IN ('urbaine', 'routiere', 'depot')),
    capacite_essence INTEGER NOT NULL DEFAULT 0,
    capacite_gasoil INTEGER NOT NULL DEFAULT 0,
    capacite_gpl INTEGER NOT NULL DEFAULT 0,
    capacite_lubrifiants INTEGER NOT NULL DEFAULT 0,
    stock_essence INTEGER NOT NULL DEFAULT 0,
    stock_gasoil INTEGER NOT NULL DEFAULT 0,
    stock_gpl INTEGER NOT NULL DEFAULT 0,
    stock_lubrifiants INTEGER NOT NULL DEFAULT 0,
    nombre_pompes INTEGER NOT NULL DEFAULT 2,
    gestionnaire_nom TEXT,
    gestionnaire_telephone TEXT,
    gestionnaire_email TEXT,
    statut TEXT NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'fermee', 'en_travaux', 'attente_validation')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. IMPORTATION MODULE
CREATE TABLE IF NOT EXISTS public.import_produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    unite TEXT DEFAULT 'Tonnes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    pays TEXT NOT NULL,
    adresse TEXT,
    contact_nom TEXT,
    contact_email TEXT,
    contact_tel TEXT,
    statut TEXT DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_navires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    imo_number TEXT UNIQUE NOT NULL,
    pavillon TEXT,
    capacite_mt DECIMAL(20,2),
    statut TEXT DEFAULT 'disponible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dossier TEXT NOT NULL UNIQUE,
    fournisseur_id UUID REFERENCES public.import_fournisseurs(id),
    produit_id UUID REFERENCES public.import_produits(id),
    quantite_prevue DECIMAL(20,2) NOT NULL,
    statut TEXT DEFAULT 'en_preparation',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_cargaisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID REFERENCES public.import_dossiers(id),
    navire_id UUID REFERENCES public.import_navires(id),
    quantite_reelle DECIMAL(20,2),
    date_chargement TIMESTAMP WITH TIME ZONE,
    date_dechargement TIMESTAMP WITH TIME ZONE,
    certificat_qualite_url TEXT,
    statut TEXT DEFAULT 'prevue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TRACEABILITY (PORT & QUALITY)
CREATE TABLE IF NOT EXISTS public.port_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id),
    actual_quantity NUMERIC NOT NULL,
    arrival_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quality_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES public.profiles(id),
    is_compliant BOOLEAN DEFAULT false,
    quantity_verified NUMERIC,
    laboratory_report_url TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. LOGISTIQUE MODULE
CREATE TABLE IF NOT EXISTS public.logistique_depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    localisation TEXT,
    capacite_max DECIMAL(20,2),
    responsable_id UUID REFERENCES public.profiles(user_id),
    statut TEXT DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logistique_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id UUID REFERENCES public.logistique_depots(id),
    produit_id UUID REFERENCES public.import_produits(id),
    quantite_disponible DECIMAL(20,2) DEFAULT 0,
    seuil_alerte DECIMAL(20,2) DEFAULT 5000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(depot_id, produit_id)
);

CREATE TABLE IF NOT EXISTS public.logistique_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id),
    depot_id UUID REFERENCES public.logistique_depots(id),
    quantite_recue DECIMAL(20,2) NOT NULL,
    date_reception TIMESTAMP WITH TIME ZONE DEFAULT now(),
    recu_par UUID REFERENCES auth.users(id),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.depot_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id),
    depot_id UUID REFERENCES public.logistique_depots(id),
    quantity NUMERIC NOT NULL,
    status TEXT DEFAULT 'en_transfert',
    validated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SUPPORT TABLES
CREATE TABLE IF NOT EXISTS public.alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    niveau TEXT NOT NULL,
    message TEXT NOT NULL,
    resolu BOOLEAN NOT NULL DEFAULT false,
    resolu_par UUID REFERENCES auth.users(id),
    resolu_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT,
    action_type TEXT NOT NULL,
    status TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. HELPERS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to core tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'entreprises', 'stations', 'import_dossiers')
    LOOP
        BEGIN
            EXECUTE format('CREATE TRIGGER tr_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()', t, t);
        EXCEPTION WHEN duplicate_object THEN null; END;
    END LOOP;
END $$;

-- 9. SECURITY (GLOBAL RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_cargaisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistique_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistique_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistique_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depot_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SIMPLE OPEN POLICIES (As requested for project stability)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Enable full access for authenticated" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Enable full access for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        EXCEPTION WHEN OTHERS THEN null; END;
    END LOOP;
END $$;

-- 10. SEED DATA (CORE ONLY)
INSERT INTO public.import_produits (nom, code) VALUES 
('Essence sans plomb', 'PMS'),
('Gasoil (Diesel)', 'AGO'),
('Kérosène / Jet A1', 'JET'),
('Fuel Oil', 'HFO'),
('Bitume', 'BIT')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.logistique_depots (nom, localisation, capacite_max) VALUES 
('Dépôt Central de Kaloum', 'Conakry', 500000),
('Dépôt de Kamsar', 'Boké', 200000),
('Dépôt de Mamou', 'Mamou', 100000)
ON CONFLICT (nom) DO NOTHING;

-- 11. ADMIN FIX (Enforce admin@nexus.com)
-- This ensures the user's main account is always super_admin
DO $$
DECLARE
    v_user_id UUID;
    v_target_email TEXT := 'admin@nexus.com';
BEGIN
    -- Search case-insensitively for the user
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_target_email);
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'User found with ID: %', v_user_id;

        -- Ensure profile exists
        INSERT INTO public.profiles (user_id, email, full_name, organisation, poste)
        VALUES (v_user_id, v_target_email, 'Super Administrator', 'Direction Générale', 'Directeur Général')
        ON CONFLICT (user_id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            poste = 'Directeur Général';
        
        -- Ensure role is super_admin
        DELETE FROM public.user_roles WHERE user_id = v_user_id;
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'super_admin');
        
        RAISE NOTICE 'Super Admin role assigned to %', v_target_email;
    ELSE
        RAISE WARNING 'User % not found in auth.users. Please create the account first.', v_target_email;
    END IF;
END $$;

-- 12. SYNC EXISTING USERS
DO $$
DECLARE
    u RECORD;
    v_role_text TEXT;
    v_role public.app_role;
BEGIN
    FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        -- Create profile if missing
        INSERT INTO public.profiles (user_id, email, full_name, organisation, poste, entreprise_id)
        VALUES (
            u.id, 
            u.email, 
            COALESCE(u.raw_user_meta_data->>'full_name', u.email),
            u.raw_user_meta_data->>'organisation',
            u.raw_user_meta_data->>'poste',
            u.raw_user_meta_data->>'entreprise_id'
        ) ON CONFLICT (user_id) DO NOTHING;

        -- Assign role if missing
        v_role_text := u.raw_user_meta_data->>'role';
        IF v_role_text IS NOT NULL AND v_role_text != '' THEN
            BEGIN
                v_role := v_role_text::public.app_role;
                INSERT INTO public.user_roles (user_id, role)
                VALUES (u.id, v_role)
                ON CONFLICT (user_id) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
    END LOOP;
END $$;
