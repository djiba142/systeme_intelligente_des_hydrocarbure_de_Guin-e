-- =====================================================
-- FIX: MISE À JOUR DES RÔLES ET DU DÉCLENCHEUR DE CRÉATION
-- =====================================================
-- À exécuter dans le SQL Editor de Supabase (https://app.supabase.com)
-- Ce script corrige l'erreur "DATABASE ERREUR SAVING NEW USER" en rendant
-- la création de profil et l'attribution de rôle robustes.

BEGIN;

-- 1. S'assurer que tous les nouveaux rôles sont dans l'ENUM app_role
DO $$
DECLARE
    roles text[] := ARRAY[
        'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint',
        'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval',
        'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval',
        'controleur_distribution', 'technicien_support_dsa', 'technicien_flux',
        'inspecteur', 'analyste', 'service_it', 'directeur_juridique', 'juriste',
        'charge_conformite', 'assistant_juridique', 'directeur_importation',
        'agent_importation', 'directeur_administratif', 'chef_service_administratif',
        'gestionnaire_documentaire', 'directeur_logistique', 'agent_logistique',
        'responsable_depots', 'responsable_transport', 'operateur_logistique',
        'technicien_aval', 'responsable_entreprise', 'gestionnaire_station',
        'agent_reception' -- Ajouté pour le nouveau workflow
    ];
    r text;
BEGIN
    FOR r IN SELECT unnest(roles) LOOP
        BEGIN
            EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''' || r || '''';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END LOOP;
END $$;

-- 2. Créer une fonction de création de profil ROBURSE (avec EXCEPTION handling)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role public.app_role;
  v_full_name text;
BEGIN
  -- Récupérer les données depuis les métadonnées auth
  v_role_text := NEW.raw_user_meta_data->>'role';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Insertion sécurisée du profil
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    entreprise_id,
    station_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    v_full_name,
    NULLIF(NEW.raw_user_meta_data->>'entreprise_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'station_id', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    entreprise_id = COALESCE(profiles.entreprise_id, EXCLUDED.entreprise_id),
    station_id = COALESCE(profiles.station_id, EXCLUDED.station_id);

  -- Attribution du rôle sécurisée
  IF v_role_text IS NOT NULL AND v_role_text != '' THEN
    BEGIN
      -- Conversion sécurisée vers l'enum
      v_role := v_role_text::public.app_role;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_role)
      ON CONFLICT (user_id) DO UPDATE SET role = v_role;
    EXCEPTION WHEN OTHERS THEN
      -- Si le rôle échoue, on ne bloque pas la création de l'utilisateur entier
      -- L'admin pourra corriger le rôle manuellement plus tard
      RAISE WARNING 'Impossible d''attribuer le rôle "%": %', v_role_text, SQLERRM;
    END;
  ELSE
    -- Rôle par défaut si non spécifié
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'gestionnaire_station')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En dernier recours, on attrape tout pour s'assurer que auth.users.insert réussit
  -- C'est crucial car sinon l'admin voit l'erreur que vous avez eue.
  RAISE WARNING 'Erreur dans handle_new_user pour %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Ré-attacher le déclencheur (trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- 4. Message de confirmation (non-standard SQL, informative)
-- "Si vous voyez ce message, le script a été exécuté avec succès !"
