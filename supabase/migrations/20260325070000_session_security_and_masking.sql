-- Phase 17: Concurrent Session Limitation
-- Step 1: Add column to track the latest valid session ID
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_session_id TEXT;

-- Step 2: Policy to allow users to update their own session ID
DROP POLICY IF EXISTS "Users can update their own session ID" ON public.profiles;
CREATE POLICY "Users can update their own session ID" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Phase 20: Weekly Security Audit Report
-- A view summarizing critical events for the last 7 days
CREATE OR REPLACE VIEW public.weekly_security_summary AS
SELECT 
    date_trunc('day', created_at) as event_date,
    action_type,
    status,
    count(*) as event_count,
    array_agg(DISTINCT user_email) as users_involved
FROM public.audit_logs
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

COMMENT ON VIEW public.weekly_security_summary IS 'Résumé hebdomadaire des événements de sécurité pour le dashboard DG.';

-- Grant access to relevant roles
GRANT SELECT ON public.weekly_security_summary TO authenticated;
