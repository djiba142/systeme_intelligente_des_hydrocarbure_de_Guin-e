-- =============================================
-- LOGISTIQUE AUTOMATION (SIHG)
-- Automatically updates logistique_stocks when 
-- a reception is recorded in logistique_receptions.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_logistique_reception_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_produit_id UUID;
BEGIN
    -- 1. Récupérer le produit_id depuis la cargaison
    SELECT produit_id INTO v_produit_id 
    FROM public.import_cargaisons c
    JOIN public.import_dossiers d ON c.dossier_id = d.id
    WHERE c.id = NEW.cargaison_id;

    -- 2. Mettre à jour ou insérer le stock dans le dépôt
    INSERT INTO public.logistique_stocks (depot_id, produit_id, quantite_disponible, updated_at)
    VALUES (NEW.depot_id, v_produit_id, NEW.quantite_recue, now())
    ON CONFLICT (depot_id, produit_id) 
    DO UPDATE SET 
        quantite_disponible = public.logistique_stocks.quantite_disponible + EXCLUDED.quantite_disponible,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS tr_update_depot_stock_on_reception ON public.logistique_receptions;
CREATE TRIGGER tr_update_depot_stock_on_reception
AFTER INSERT ON public.logistique_receptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_logistique_reception_stock_update();

COMMIT;
