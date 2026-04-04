-- À exécuter dans le SQL Editor de Supabase pour nettoyer les tables financières si elles existent.

BEGIN;

DROP TABLE IF EXISTS public.paiements_importation CASCADE;
DROP TABLE IF EXISTS public.budgets_importation CASCADE;
DROP TABLE IF EXISTS public.factures_importation CASCADE;
DROP TABLE IF EXISTS public.fournisseurs_importation CASCADE;

-- Supprimer également les éventuelles politiques orphelines liées aux rôles financiers
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' AND policyname ILIKE '%finance%' OR policyname ILIKE '%daf%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

COMMIT;
