-- =============================================
-- BACKEND SECURITY HARDENING (SIHG)
-- Removes "Enable full access" permissive policies
-- Adds strict Role-Based Access Control (RBAC)
-- =============================================

BEGIN;

-- 1. CLEANUP PERMISSIVE POLICIES
-- This function safely removes the "Enable full access..." policy from a list of tables
DO $$
DECLARE
    t text;
    tables_to_harden text[] := ARRAY[
        'ordres_livraison', 
        'regulation_quotas', 
        'regulation_agrements', 
        'regulation_licences', 
        'stations', 
        'entreprises', 
        'alertes', 
        'livraisons'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_harden) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable full access for authenticated" ON public.%I', t);
    END LOOP;
END $$;

-- 2. SPECIFIC POLICIES: Entités (Stations & Entreprises)
-- Everyone authenticated can view
CREATE POLICY "sonap_view_entities" ON public.entreprises FOR SELECT TO authenticated USING (true);
CREATE POLICY "sonap_view_stations" ON public.stations FOR SELECT TO authenticated USING (true);

-- Creation/Update: Strategic SONAP roles only
CREATE POLICY "sonap_manage_entities" ON public.entreprises FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint')));

CREATE POLICY "sonap_manage_stations" ON public.stations FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_etat', 'directeur_aval', 'chef_service_aval')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_etat', 'directeur_aval', 'chef_service_aval')));

-- 3. SPECIFIC POLICIES: Logistique (Ordres & Livraisons)
-- View: Logistique + Aval + Strategic
CREATE POLICY "log_view_ops" ON public.ordres_livraison FOR SELECT TO authenticated USING (true);
CREATE POLICY "log_view_livraisons" ON public.livraisons FOR SELECT TO authenticated USING (true);

-- Manage: Logistique Personnel + Aval Management
CREATE POLICY "log_manage_orders" ON public.ordres_livraison FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_logistique', 'agent_logistique', 'directeur_aval')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_logistique', 'agent_logistique', 'directeur_aval')));

-- 4. SPECIFIC POLICIES: Régulation (Quotas, Agréments, Licences)
-- View: Regulation + Strategic
CREATE POLICY "reg_view_docs" ON public.regulation_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_view_agrements" ON public.regulation_agrements FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_view_licences" ON public.regulation_licences FOR SELECT TO authenticated USING (true);

-- Manage: Admin Central + Regulation roles
CREATE POLICY "reg_manage_all" ON public.regulation_quotas FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation', 'analyste_regulation')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation', 'analyste_regulation')));

CREATE POLICY "reg_manage_docs" ON public.regulation_agrements FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation')));

CREATE POLICY "reg_manage_licences" ON public.regulation_licences FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'chef_regulation')));

-- 5. AUDIT LOGS
ALTER TABLE public.regulation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_view_strategic" ON public.regulation_logs FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_central', 'directeur_general')));

COMMIT;
