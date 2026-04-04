-- Correction du trigger d'automatisation des quotas pour correspondre à la table livraisons
-- Utilise 'validee' au lieu de 'livree', et les colonnes correctes (produit, quantite_recue)

CREATE OR REPLACE FUNCTION public.update_quota_on_delivery()
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
BEGIN
  -- Déterminer la date de référence (date_reception ou created_at)
  v_date_pref := COALESCE(NEW.date_reception, NEW.created_at, now());
  v_annee := EXTRACT(YEAR FROM v_date_pref);
  v_mois := EXTRACT(MONTH FROM v_date_pref);
  
  -- Récupérer l'entreprise_id de la station
  SELECT entreprise_id INTO v_entreprise_id 
  FROM public.stations 
  WHERE id = NEW.station_id;

  -- Le statut final du workflow est 'validee' (DISPONIBLE EN STATION)
  IF NEW.statut = 'validee' AND (OLD.statut IS NULL OR OLD.statut != 'validee') THEN
      -- 1. Mise à jour du Quota de la Station
      UPDATE public.quotas_stations
      SET quantite_utilisee = quantite_utilisee + COALESCE(NEW.quantite_recue, NEW.quantite_prevue),
          updated_at = now()
      WHERE station_id = NEW.station_id 
        AND annee = v_annee 
        AND mois = v_mois 
        AND produit = lower(NEW.produit);
        
      -- 2. Mise à jour du Quota de l'Entreprise
      IF v_entreprise_id IS NOT NULL THEN
        UPDATE public.quotas_entreprises
        SET quantite_utilisee = quantite_utilisee + COALESCE(NEW.quantite_recue, NEW.quantite_prevue),
            updated_at = now()
        WHERE entreprise_id = v_entreprise_id 
          AND annee = v_annee 
          AND mois = v_mois 
          AND produit = lower(NEW.produit);
      END IF;

      -- 3. TODO: Optionnel - Mise à jour du stock physique de la station (si géré par une table dédiée)
  END IF;

  RETURN NEW;
END;
$$;
