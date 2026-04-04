import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RequireRoleProps {
    allowedRoles: AppRole[];
}

export function RequireRole({ allowedRoles }: RequireRoleProps) {
    const { user, role, loading, getDashboardRoute } = useAuth();
    const location = useLocation();

    if (loading && !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vérification des accès...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (!role) {
        // User is logged in but has no role - we sign them out instead of showing an error page
        // This is more professional as requested
        supabase.auth.signOut();
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(role)) {
        // Instead of showing "Access Denied", redirect them to their own dashboard
        // This keeps the user in their authorized flow
        return <Navigate to={getDashboardRoute()} replace />;
    }

    return <Outlet />;
}
