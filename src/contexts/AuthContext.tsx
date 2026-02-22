import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Types de rôles disponibles dans l'application - Alignés avec Supabase enum app_role
export type AppRole =
  | 'super_admin'
  | 'admin_etat'
  | 'inspecteur'
  | 'analyste'
  | 'personnel_admin'
  | 'service_it'
  | 'responsable_entreprise'
  | 'gestionnaire_station';

// Interface du profil utilisateur
interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  entreprise_id?: string;
  station_id?: string;
  region?: string;
}

// Interface pour la création d'un utilisateur (super_admin ou service_it uniquement)
interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
  entrepriseId?: string;
  stationId?: string;
  region?: string;
}

// Interface du contexte d'authentification
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  hasProfile: boolean;
  hasRole: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  canAccess: (requiredRole: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  createUser: (params: CreateUserParams) => Promise<{ error: Error | null; userId?: string }>;
  updateUser: (userId: string, params: Partial<CreateUserParams>) => Promise<{ error: Error | null }>;
  deleteUser: (userId: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getDashboardRoute: () => string;
  isReadOnly: boolean;
  canManageUsers: boolean;
  canAddObservation: boolean;
  canModifyData: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hiérarchie des rôles : plus petit = plus de permissions
const ROLE_HIERARCHY: Record<AppRole, number> = {
  'super_admin': 1,
  'admin_etat': 2,
  'inspecteur': 3,
  'analyste': 4,
  'personnel_admin': 5,
  'service_it': 6,
  'responsable_entreprise': 7,
  'gestionnaire_station': 8,
};

// Rôles avec accès en lecture seule (pas de modification de données métier)
const READ_ONLY_ROLES: AppRole[] = ['inspecteur', 'analyste', 'personnel_admin'];

// Rôles pouvant gérer les utilisateurs
const USER_MANAGEMENT_ROLES: AppRole[] = ['super_admin', 'service_it'];

// Rôles pouvant ajouter des observations
const OBSERVATION_ROLES: AppRole[] = ['inspecteur'];

// Rôles pouvant modifier les données métier
const DATA_MODIFY_ROLES: AppRole[] = ['super_admin', 'admin_etat', 'responsable_entreprise', 'gestionnaire_station'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent duplicate fetchUserData calls
  const fetchingRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const hasProfile = !!profile;
  const hasRole = !!role;

  const fetchUserData = useCallback(async (userId: string) => {
    // Avoid duplicate concurrent fetches for the same user
    if (fetchingRef.current && lastFetchedUserId.current === userId) return;
    fetchingRef.current = true;
    lastFetchedUserId.current = userId;

    try {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (profileResult.error) {
        console.warn('Error fetching profile:', profileResult.error);
      } else if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      if (roleResult.error) {
        console.warn('Error fetching role:', roleResult.error);
        // Fallback: try limit query
        const { data: roleFallback } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .limit(1);
        if (roleFallback && roleFallback.length > 0) {
          setRole(roleFallback[0].role as AppRole);
        } else {
          setRole(null);
        }
      } else if (roleResult.data) {
        setRole(roleResult.data.role as AppRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Unexpected error in fetchUserData:', error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: Set up auth listener first, then check for existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    lastFetchedUserId.current = null;
  }, []);

  const canAccess = useCallback((requiredRole: AppRole): boolean => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] <= ROLE_HIERARCHY[requiredRole];
  }, [role]);

  const hasAnyRole = useCallback((roles: AppRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  }, [role]);

  const getDashboardRoute = useCallback((): string => {
    if (!role) return '/auth';
    switch (role) {
      case 'super_admin':
        return '/dashboard/admin';
      case 'admin_etat':
      case 'inspecteur':
        return '/dashboard/inspecteur';
      case 'analyste':
        return '/dashboard/analyste';
      case 'personnel_admin':
        return '/dashboard/personnel-admin';
      case 'service_it':
        return '/dashboard/service-it';
      case 'responsable_entreprise':
        return '/dashboard/entreprise';
      case 'gestionnaire_station':
        return '/dashboard/entreprise';
      default:
        return '/auth';
    }
  }, [role]);

  // Calculs RBAC (memoized)
  const isReadOnly = role ? READ_ONLY_ROLES.includes(role) : true;
  const canManageUsers = role ? USER_MANAGEMENT_ROLES.includes(role) : false;
  const canAddObservation = role ? OBSERVATION_ROLES.includes(role) : false;
  const canModifyData = role ? DATA_MODIFY_ROLES.includes(role) : false;

  /**
   * CREATE USER: 
   * Uses signUp then immediately restores current admin session.
   * This prevents the admin from being logged out.
   */
  const createUser = useCallback(async (params: CreateUserParams): Promise<{ error: Error | null; userId?: string }> => {
    const { email, password, fullName, role: newUserRole, entrepriseId, stationId } = params;
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    // Save current session token before creating new user
    const currentSession = session;

    try {
      // Create the user via signUp (this will switch session)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Utilisateur non créé');

      const newUserId = authData.user.id;

      // IMMEDIATELY restore the admin session to prevent losing it
      if (currentSession?.refresh_token) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // Now insert role and profile with admin session restored
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: newUserRole });

      if (roleError) {
        console.error('Error inserting role:', roleError);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: newUserId,
          email: email,
          full_name: fullName,
          entreprise_id: entrepriseId || null,
          station_id: stationId || null,
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Error upserting profile:', profileError);
      }

      return { error: null, userId: newUserId };
    } catch (error) {
      // Restore admin session on error too
      if (currentSession?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          });
        } catch {
          // Session restore failed, but we still report the original error
        }
      }
      return { error: error as Error };
    }
  }, [canManageUsers, session]);

  /**
   * UPDATE USER:
   * Updates the profile and role of an existing user.
   */
  const updateUser = useCallback(async (userId: string, params: Partial<CreateUserParams>): Promise<{ error: Error | null }> => {
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // Update profile
      const profileUpdates: Record<string, unknown> = {};
      if (params.fullName) profileUpdates.full_name = params.fullName;
      if (params.email) profileUpdates.email = params.email;
      if (params.entrepriseId !== undefined) profileUpdates.entreprise_id = params.entrepriseId || null;
      if (params.stationId !== undefined) profileUpdates.station_id = params.stationId || null;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', userId);

        if (profileError) throw profileError;
      }

      // Update role if specified
      if (params.role) {
        // Try update first
        const { error: roleUpdateError, count } = await supabase
          .from('user_roles')
          .update({ role: params.role })
          .eq('user_id', userId);

        if (roleUpdateError) {
          // Fallback: delete and re-insert
          await supabase.from('user_roles').delete().eq('user_id', userId);
          const { error: roleInsertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: params.role });
          if (roleInsertError) throw roleInsertError;
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [canManageUsers]);

  /**
   * DELETE USER:
   * Deletes the user's profile and role from the database.
   * Note: Cannot delete auth.users from client-side; only profile + role are removed.
   */
  const deleteUser = useCallback(async (userId: string): Promise<{ error: Error | null }> => {
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // Delete role first (no FK constraint issues)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.warn('Error deleting user role:', roleError);
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [canManageUsers]);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    role,
    loading,
    hasProfile,
    hasRole,
    signIn,
    signUp,
    signOut,
    canAccess,
    hasAnyRole,
    createUser,
    updateUser,
    deleteUser,
    resetPasswordForEmail,
    updatePassword,
    getDashboardRoute,
    isReadOnly,
    canManageUsers,
    canAddObservation,
    canModifyData,
  }), [
    user, session, profile, role, loading, hasProfile, hasRole,
    signIn, signUp, signOut, canAccess, hasAnyRole, createUser,
    updateUser, deleteUser, resetPasswordForEmail, updatePassword,
    getDashboardRoute, isReadOnly, canManageUsers, canAddObservation, canModifyData,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  'super_admin': 'Super Administrateur (SONAP)',
  'admin_etat': 'Administrateur État',
  'inspecteur': 'Inspecteur / Superviseur État',
  'analyste': 'Analyste Stratégique',
  'personnel_admin': 'Personnel Administratif SONAP',
  'service_it': 'Service Informatique (Admin Système)',
  'responsable_entreprise': 'Responsable Entreprise',
  'gestionnaire_station': 'Gestionnaire de Station',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  'super_admin': 'Accès complet à la plateforme nationale et gestion du système',
  'admin_etat': 'Supervision nationale et contrôle réglementaire',
  'inspecteur': 'Contrôle terrain, observations et rapports régionaux (lecture + observations)',
  'analyste': 'Analyse stratégique, statistiques nationales et export de rapports (lecture avancée)',
  'personnel_admin': 'Gestion administrative interne, dossiers entreprises (administration limitée)',
  'service_it': 'Maintenance technique, gestion comptes et logs système (technique uniquement)',
  'responsable_entreprise': 'Gestion des stations et des stocks de son entreprise',
  'gestionnaire_station': 'Gestion opérationnelle de la station',
};
