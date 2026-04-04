-- Migration: Backend Automation for SIHG
-- This script adds triggers to automate stock management and alerting.

BEGIN;

-- 1. Function to update station stock when a delivery is marked as 'livree'
CREATE OR REPLACE FUNCTION public.update_station_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the status changes to 'livree'
    IF (NEW.statut = 'livree' AND (OLD.statut IS NULL OR OLD.statut != 'livree')) THEN
        -- Update the specific fuel type stock in the stations table
        IF NEW.carburant = 'essence' THEN
            UPDATE public.stations 
            SET stock_essence = stock_essence + NEW.quantite,
                updated_at = now()
            WHERE id = NEW.station_id;
        ELSIF NEW.carburant = 'gasoil' THEN
            UPDATE public.stations 
            SET stock_gasoil = stock_gasoil + NEW.quantite,
                updated_at = now()
            WHERE id = NEW.station_id;
        ELSIF NEW.carburant = 'gpl' THEN
            UPDATE public.stations 
            SET stock_gpl = stock_gpl + NEW.quantite,
                updated_at = now()
            WHERE id = NEW.station_id;
        ELSIF NEW.carburant = 'lubrifiants' THEN
            UPDATE public.stations 
            SET stock_lubrifiants = stock_lubrifiants + NEW.quantite,
                updated_at = now()
            WHERE id = NEW.station_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for deliveries
DROP TRIGGER IF EXISTS tr_update_stock_on_delivery ON public.livraisons;
CREATE TRIGGER tr_update_stock_on_delivery
AFTER UPDATE ON public.livraisons
FOR EACH ROW
EXECUTE FUNCTION public.update_station_stock_on_delivery();


-- 2. Function to automatically create alerts for low stock
CREATE OR REPLACE FUNCTION public.check_stock_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold_critical FLOAT := 0.15; -- 15%
    v_threshold_warning FLOAT := 0.25;  -- 25%
    v_msg TEXT;
    v_entreprise_id UUID;
BEGIN
    SELECT entreprise_id INTO v_entreprise_id FROM public.stations WHERE id = NEW.id;

    -- Check Essence
    IF NEW.stock_essence < (NEW.capacite_essence * v_threshold_critical) THEN
        v_msg := 'URGENT: Stock essence critique à ' || NEW.nom || ' (' || NEW.stock_essence || 'L)';
        INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
        VALUES (NEW.id, v_entreprise_id, 'stock_critical', 'critique', v_msg);
    ELSIF NEW.stock_essence < (NEW.capacite_essence * v_threshold_warning) THEN
        v_msg := 'Alerte: Stock essence faible à ' || NEW.nom || ' (' || NEW.stock_essence || 'L)';
        INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
        VALUES (NEW.id, v_entreprise_id, 'stock_warning', 'alerte', v_msg);
    END IF;

    -- Check Gasoil
    IF NEW.stock_gasoil < (NEW.capacite_gasoil * v_threshold_critical) THEN
        v_msg := 'URGENT: Stock gasoil critique à ' || NEW.nom || ' (' || NEW.stock_gasoil || 'L)';
        INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
        VALUES (NEW.id, v_entreprise_id, 'stock_critical', 'critique', v_msg);
    ELSIF NEW.stock_gasoil < (NEW.capacite_gasoil * v_threshold_warning) THEN
        v_msg := 'Alerte: Stock gasoil faible à ' || NEW.nom || ' (' || NEW.stock_gasoil || 'L)';
        INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
        VALUES (NEW.id, v_entreprise_id, 'stock_warning', 'alerte', v_msg);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for stock check
DROP TRIGGER IF EXISTS tr_check_stock_thresholds ON public.stations;
CREATE TRIGGER tr_check_stock_thresholds
AFTER UPDATE OF stock_essence, stock_gasoil ON public.stations
FOR EACH ROW
EXECUTE FUNCTION public.check_stock_thresholds();


-- 3. Audit Logs Table (if not exists)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- 4. Function for automatic auditing
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
BEGIN
    v_user_email := COALESCE(auth.jwt() ->> 'email', 'system@sihg.gov.gn');
    
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(OLD.id AS TEXT), jsonb_build_object('old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW)));
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(NEW.id AS TEXT), jsonb_build_object('new_data', to_jsonb(NEW)));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(OLD.id AS TEXT), jsonb_build_object('old_data', to_jsonb(OLD)));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit critical tables
CREATE TRIGGER tr_audit_stations AFTER INSERT OR UPDATE OR DELETE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER tr_audit_importations AFTER INSERT OR UPDATE OR DELETE ON public.importations FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER tr_audit_livraisons AFTER INSERT OR UPDATE OR DELETE ON public.livraisons FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

COMMIT;
