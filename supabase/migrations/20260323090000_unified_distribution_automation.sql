-- =============================================
-- UNIFIED DISTRIBUTION AUTOMATION (SIHG)
-- Handles: 
-- 1. Physical Stock Update in Stations table
-- 2. Monthly Quota Update (Station & Enterprise)
-- Status trigger: 'validee' (Confirmed at Station)
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_distribution_delivery_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee INTEGER;
  v_mois INTEGER;
  v_entreprise_id UUID;
  v_date_pref TIMESTAMPTZ;
  v_produit TEXT;
  v_quantite NUMERIC;
BEGIN
  -- 1. Configuration des variables
  v_date_pref := COALESCE(NEW.date_reception, NEW.created_at, now());
  v_annee := EXTRACT(YEAR FROM v_date_pref);
  v_mois := EXTRACT(MONTH FROM v_date_pref);
  v_produit := lower(NEW.produit);
  v_quantite := COALESCE(NEW.quantite_recue, NEW.quantite_prevue, 0);
  
  -- Récupérer l'entreprise_id de la station
  SELECT entreprise_id INTO v_entreprise_id FROM public.stations WHERE id = NEW.station_id;

  -- 2. Logique lors du passage au statut 'validee' (Arrivée Station)
  IF NEW.statut = 'validee' AND (OLD.statut IS NULL OR OLD.statut != 'validee') THEN
      
      -- A. MISE À JOUR DU STOCK PHYSIQUE (Table stations)
      IF v_produit = 'essence' THEN
          UPDATE public.stations SET stock_essence = stock_essence + v_quantite, updated_at = now() WHERE id = NEW.station_id;
      ELSIF v_produit = 'gasoil' THEN
          UPDATE public.stations SET stock_gasoil = stock_gasoil + v_quantite, updated_at = now() WHERE id = NEW.station_id;
      ELSIF v_produit = 'gpl' THEN
          UPDATE public.stations SET stock_gpl = stock_gpl + v_quantite, updated_at = now() WHERE id = NEW.station_id;
      ELSIF v_produit = 'lubrifiants' THEN
          UPDATE public.stations SET stock_lubrifiants = stock_lubrifiants + v_quantite, updated_at = now() WHERE id = NEW.station_id;
      END IF;

      -- B. MISE À JOUR DES QUOTAS (Station)
      UPDATE public.quotas_stations
      SET quantite_utilisee = quantite_utilisee + v_quantite, updated_at = now()
      WHERE station_id = NEW.station_id AND annee = v_annee AND mois = v_mois AND produit = v_produit;
        
      -- C. MISE À JOUR DES QUOTAS (Entreprise)
      IF v_entreprise_id IS NOT NULL THEN
        UPDATE public.quotas_entreprises
        SET quantite_utilisee = quantite_utilisee + v_quantite, updated_at = now()
        WHERE entreprise_id = v_entreprise_id AND annee = v_annee AND mois = v_mois AND produit = v_produit;
      END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Remplacement des anciens triggers par le nouveau unifié
DROP TRIGGER IF EXISTS tr_quota_consumption ON public.livraisons;
DROP TRIGGER IF EXISTS tr_update_stock_on_delivery ON public.livraisons;

CREATE TRIGGER tr_distribution_automation
AFTER UPDATE OF statut ON public.livraisons
FOR EACH ROW
EXECUTE FUNCTION public.handle_distribution_delivery_validation();
