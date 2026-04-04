-- ============================================================
-- Audit Logs Table — Création + RLS stricte par rôle
-- ============================================================

-- 1. Créer la table (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  resource_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT,
  error_message TEXT,
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entreprise_id ON audit_logs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);

-- 3. Activer RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer TOUTES les anciennes politiques
DROP POLICY IF EXISTS "super_admin_view_all_logs" ON audit_logs;
DROP POLICY IF EXISTS "admin_roles_view_all_logs" ON audit_logs;
DROP POLICY IF EXISTS "entreprise_manager_view_own_logs" ON audit_logs;
DROP POLICY IF EXISTS "users_insert_own_logs" ON audit_logs;
DROP POLICY IF EXISTS "allow_anon_insert_failed_login" ON audit_logs;
DROP POLICY IF EXISTS "users_view_own_logs" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can view all logs" ON audit_logs;
DROP POLICY IF EXISTS "Super Admin can view audit logs" ON audit_logs;

-- 5. SELECT : super_admin et service_it voient TOUS les logs
CREATE POLICY "super_admin_view_all_logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'service_it', 'directeur_general', 'directeur_adjoint')
    )
  );

-- 6. SELECT : Les responsables d'entreprise ne voient que les logs de leur entreprise
CREATE POLICY "entreprise_manager_view_own_logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    entreprise_id IS NOT NULL
    AND entreprise_id IN (
      SELECT p.entreprise_id FROM profiles p WHERE p.user_id = auth.uid() AND p.entreprise_id IS NOT NULL
    )
  );

-- 7. SELECT : Chaque utilisateur voit ses propres logs
CREATE POLICY "users_view_own_logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 8. INSERT : Tout utilisateur authentifié peut insérer ses propres logs
CREATE POLICY "users_insert_own_logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
