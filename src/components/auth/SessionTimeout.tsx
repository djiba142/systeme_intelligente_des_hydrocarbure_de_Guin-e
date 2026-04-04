import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE = 60 * 1000; // 1 minute warning before logout

export const SessionTimeout = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    // Save current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }

    await supabase.auth.signOut();
    toast({
      title: "Session expirée",
      description: "Vous avez été déconnecté pour inactivité par mesure de sécurité.",
      variant: "destructive",
    });
    navigate('/auth?reason=expired');
  }, [navigate, toast]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (profile) {
      warningRef.current = setTimeout(() => {
        toast({
          title: "Alerte de sécurité",
          description: "Votre session va expirer dans 1 minute suite à votre inactivité.",
        });
      }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [profile, logout, toast]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    
    if (profile) {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer();
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [profile, resetTimer]);

  return null;
};
