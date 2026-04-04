import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { role, loading, getDashboardRoute } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role) {
      const route = getDashboardRoute();
      navigate(route, { replace: true });
    }
  }, [role, loading, navigate, getDashboardRoute]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirection vers votre espace...</p>
      </div>
    </div>
  );
};

export default Index;
