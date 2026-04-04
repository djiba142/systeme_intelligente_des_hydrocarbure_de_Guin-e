import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, canAccess, mfaSetupRequired, mfaVerificationRequired } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Save current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !canAccess(requiredRole)) {
    return <Navigate to="/acces-refuse" replace />;
  }

  // ==== BLOCAGE MFA ====
  if (mfaSetupRequired) {
    return <Navigate to="/auth?mfa=setup" replace />;
  }

  if (mfaVerificationRequired) {
    return <Navigate to="/auth?mfa=verify" replace />;
  }

  return <>{children}</>;
}
