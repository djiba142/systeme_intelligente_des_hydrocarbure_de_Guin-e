import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { User, Session, createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logLogin } from '@/lib/auditLog';

// Types de rôles disponibles dans l'application - Alignés avec Supabase enum app_role
export type AppRole =
  | 'super_admin'
  | 'admin_etat'
  | 'directeur_general'
  | 'directeur_adjoint'
  | 'secretaire_general'
  | 'directeur_aval'
  | 'directeur_adjoint_aval'
  | 'chef_division_distribution'
  | 'chef_bureau_aval'
  | 'agent_supervision_aval'
  | 'controleur_distribution'
  | 'technicien_support_dsa'
  | 'technicien_flux'
  | 'inspecteur'
  | 'service_it'
  | 'responsable_entreprise'
  | 'responsable_stations'
  | 'gestionnaire_livraisons'
  | 'operateur_entreprise'

  | 'directeur_importation'
  | 'agent_importation'
  | 'responsable_stock'
  | 'agent_station'
  | 'technicien_aval';

// Interface du profil utilisateur
interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  prenom?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  entreprise_id?: string;
  station_id?: string;
  poste?: string;
  organisation?: string;
  direction?: string;
  region?: string;
  prefecture?: string;
  commune?: string;
  sexe?: 'M' | 'F';
  date_naissance?: string;
  adresse?: string;
  matricule?: string;
  first_login_done?: boolean;
  force_password_change?: boolean;
  active_device_id?: string | null;
}

// Interface pour la création d'un utilisateur (super_admin ou service_it uniquement)
interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  prenom?: string;
  role: AppRole;
  entrepriseId?: string;
  stationId?: string;
  region?: string;
  prefecture?: string;
  commune?: string;
  organisation?: string;
  direction?: string;
  poste?: string;
  sexe?: 'M' | 'F';
  dateNaissance?: string;
  adresse?: string;
  matricule?: string;
  forcePasswordChange?: boolean;
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
  isSessionLocked: boolean;
  lockSession: () => void;
  unlockSession: (password: string) => Promise<{ error: Error | null }>;
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
  canManageStations: boolean;
  canManageEntreprises: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hiérarchie des rôles : plus petit = plus de permissions
const ROLE_HIERARCHY: Record<AppRole, number> = {
  'super_admin': 1,
  'directeur_general': 2,
  'directeur_adjoint': 2,
  'admin_etat': 3,
  'secretaire_general': 3,
  'directeur_aval': 4,
  'directeur_adjoint_aval': 4,
  'chef_division_distribution': 5,
  'chef_bureau_aval': 6,
  'agent_supervision_aval': 7,
  'controleur_distribution': 7,
  'technicien_support_dsa': 8,
  'technicien_flux': 8,
  'inspecteur': 9,
  'service_it': 1,
  'responsable_entreprise': 12,
  'responsable_stations': 13,
  'gestionnaire_livraisons': 13,
  'operateur_entreprise': 14,

  'directeur_importation': 4,
  'agent_importation': 5,
  'responsable_stock': 13,
  'agent_station': 14,
  'technicien_aval': 8,
};

// Rôles avec accès en lecture seule (pas de modification de données métier)
const READ_ONLY_ROLES: AppRole[] = ['inspecteur', 'agent_supervision_aval', 'technicien_support_dsa', 'secretaire_general', 'directeur_general', 'directeur_adjoint', 'service_it'];

// Rôles pouvant gérer les utilisateurs
const USER_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin', 'admin_etat',
  'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'responsable_entreprise',
  'directeur_importation'
];

// Rôles pouvant ajouter des observations
const OBSERVATION_ROLES: AppRole[] = ['inspecteur', 'chef_bureau_aval', 'agent_supervision_aval'];

// Rôles pouvant modifier les données métier (stocks, ventes, livraisons)
const DATA_MODIFY_ROLES: AppRole[] = [
  'directeur_aval',
  'chef_division_distribution',
  'responsable_entreprise',
  'responsable_stations',
  'gestionnaire_livraisons',
  'operateur_entreprise',
  'operateur_entreprise'
];

// Rôles pouvant gérer les stations (Créer/Modifier/Supprimer)
// Seuls les rôles opérationnels peuvent gérer les stations (pas DG/DGA/DSI)
const STATION_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin',
  'admin_etat',
  'directeur_general',
  'directeur_adjoint',
  'directeur_aval',
  'directeur_adjoint_aval',
  'chef_division_distribution',
  'chef_bureau_aval',
];

// Seul admin_etat peut créer des entreprises (DG/DGA consultent seulement)
const ENTREPRISE_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin',
  'admin_etat',
  'directeur_general',
  'directeur_adjoint',
  'directeur_aval',
  'directeur_adjoint_aval',
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Prevent duplicate fetchUserData calls
  const fetchingRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const hasProfile = !!profile;
  const hasRole = !!role;

  const fetchUserData = useCallback(async (userId: string) => {
    // If already fetching for this same user, don't duplicate but don't skip loading either
    if (fetchingRef.current && lastFetchedUserId.current === userId) {
      console.log(`fetchUserData: already fetching for ${userId}, skipping duplicate call`);
      return;
    }
    
    console.log(`fetchUserData: starting fetch for ${userId}`);
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

      console.log(`fetchUserData: profile result:`, profileResult.data ? 'found' : 'not found', profileResult.error?.message || '');
      console.log(`fetchUserData: role result:`, roleResult.data ? roleResult.data.role : 'not found', roleResult.error?.message || '');

      if (profileResult.data) {
        const profileData = profileResult.data as Profile;
        const localDeviceId = localStorage.getItem('sihg_device_id');
        
        // Vérification de collision de session
        if (profileData.active_device_id && localDeviceId && profileData.active_device_id !== localDeviceId) {
          console.warn('Session conflict detected on load. Signing out.');
          await supabase.auth.signOut();
          window.location.href = '/auth?error=session_conflict';
          return;
        }
        
        setProfile(profileData);
      } else {
        console.warn(`fetchUserData: No profile found for user ${userId}`);
      }

      if (roleResult.data) {
        console.log(`Rôle chargé pour ${userId}:`, roleResult.data.role);
        setRole(roleResult.data.role as AppRole);
      } else {
        if (roleResult.error) console.error('Erreur lors du chargement du rôle:', roleResult.error.message);
        
        // Fallback: try limit query
        const { data: roleFallback, error: fallbackError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .limit(1);
        
        if (roleFallback && roleFallback.length > 0) {
          console.log(`Rôle chargé (fallback) pour ${userId}:`, roleFallback[0].role);
          setRole(roleFallback[0].role as AppRole);
        } else {
          if (fallbackError) console.error('Erreur fallback rôle:', fallbackError.message);
          console.warn(`Aucun rôle trouvé pour l'utilisateur ${userId}. Vérifiez la table user_roles.`);
          setRole(null);
        }
      }
    } catch (error) {
      console.error('fetchUserData: Critical error:', error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      console.log(`fetchUserData: completed for ${userId}`);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: Set up auth listener first, then check for existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
          // Log login only on a new sign-in event, not on session restoration
          if (event === 'SIGNED_IN') {
            setTimeout(() => logLogin(), 500);
          }
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

    return () => {
      subscription.unsubscribe();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [fetchUserData]);

  // Surveillance temps réel de la session active
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`session_monitor_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const localDeviceId = localStorage.getItem('sihg_device_id');
        const newDeviceId = payload.new.active_device_id;
        
        if (newDeviceId && localDeviceId && newDeviceId !== localDeviceId) {
          console.warn('Déconnexion forcée: nouvelle session détectée sur un autre appareil');
          supabase.auth.signOut().then(() => {
            window.location.href = '/auth?error=session_conflict';
          });
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // --- INACTIVITY LOCK SYSTEM ---
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user && !loading) {
      inactivityTimer.current = setTimeout(async () => {
        console.log('Session expirée pour inactivité (5 min). Déconnexion...');
        await supabase.auth.signOut();
        window.location.href = '/auth?reason=inactivity';
      }, 5 * 60 * 1000); // 5 minutes
    }
  }, [user, loading]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handler));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  const lockSession = useCallback(() => setIsSessionLocked(true), []);

  const unlockSession = useCallback(async (password: string) => {
    if (!user?.email) return { error: new Error("Utilisateur non identifié") };
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });
    if (!error) {
      setIsSessionLocked(false);
      resetInactivityTimer();
    }
    return { error };
  }, [user?.email, resetInactivityTimer]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Log failed login attempt
      try {
        await (supabase as any).from('audit_logs').insert([{
          user_email: email,
          action_type: 'LOGIN',
          status: 'failed',
          error_message: error.message,
          details: { login_timestamp: new Date().toISOString() },
        }]);
      } catch { /* ignore */ }
    } else if (data.user) {
      // Generate and register new device session
      const deviceId = crypto.randomUUID();
      localStorage.setItem('sihg_device_id', deviceId);
      
      try {
        await supabase
          .from('profiles')
          .update({ active_device_id: deviceId } as any)
          .eq('user_id', data.user.id);
      } catch (err) {
        console.error('Failed to set active_device_id', err);
      }
    }
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
      case 'directeur_general':
      case 'directeur_adjoint':
      case 'admin_etat':
      case 'secretaire_general':
        return '/dashboard/admin-etat';
      case 'inspecteur':
        return '/dashboard/inspecteur';
      case 'service_it':
        return '/dashboard/service-it';
      case 'directeur_aval':
      case 'directeur_adjoint_aval':
      case 'chef_division_distribution':
      case 'chef_bureau_aval':
      case 'agent_supervision_aval':
      case 'controleur_distribution':
      case 'technicien_support_dsa':
      case 'technicien_flux':
      case 'technicien_aval':
        return '/dashboard/dsa';
      case 'responsable_entreprise':
      case 'responsable_stations':
      case 'gestionnaire_livraisons':
      case 'operateur_entreprise':
      case 'responsable_stock':
      case 'agent_station':
        return '/dashboard/entreprise';

      case 'directeur_importation':
      case 'agent_importation':
        return '/dashboard/importation';
      default:
        return '/auth';
    }
  }, [role]);

  // Calculs RBAC (memoized)
  const isReadOnly = role ? READ_ONLY_ROLES.includes(role) : true;
  const canManageUsers = role ? USER_MANAGEMENT_ROLES.includes(role) : false;
  const canAddObservation = role ? OBSERVATION_ROLES.includes(role) : false;
  const canModifyData = role ? DATA_MODIFY_ROLES.includes(role) : false;
  const canManageStations = useMemo(() => {
    if (!role) return false;
    if (!STATION_MANAGEMENT_ROLES.includes(role)) return false;
    if (role === 'responsable_entreprise') return !!profile?.entreprise_id;
    return true;
  }, [role, profile]);

  const canManageEntreprises = useMemo(() => {
    if (!role) return false;
    return ENTREPRISE_MANAGEMENT_ROLES.includes(role);
  }, [role]);

  /**
   * CREATE USER: 
   * Uses signUp then immediately restores current admin session.
   * This prevents the admin from being logged out.
   */
  const createUser = useCallback(async (params: CreateUserParams): Promise<{ error: Error | null; userId?: string }> => {
    const {
      email, password, fullName, prenom, role: newUserRole,
      entrepriseId, stationId, region, prefecture, commune,
      organisation, direction, poste, sexe, dateNaissance,
      adresse, matricule, forcePasswordChange
    } = params;
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // Create a temporary client that doesn't persist the session, thus keeping the admin logged in!
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // Create the user via the temporary client
      const { data: authData, error: signUpError } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: newUserRole
          }
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Utilisateur non créé');

      const newUserId = authData.user.id;

      // 1. Remove any role assigned by the DB trigger (could be wrong default)
      await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', newUserId);

      // 2. Insert the ACTUAL role chosen by the admin
      const { error: roleError } = await (supabase as any)
        .from('user_roles')
        .insert({ user_id: newUserId, role: newUserRole });

      if (roleError) {
        console.error('Error inserting role:', roleError);
        // Try upsert as fallback
        const { error: upsertError } = await (supabase as any)
          .from('user_roles')
          .upsert({ user_id: newUserId, role: newUserRole }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Upsert role also failed:', upsertError);
          throw new Error(`Erreur d'attribution du rôle "${newUserRole}" : ${upsertError.message}. Ce rôle n'existe peut-être pas encore dans la base de données. Exécutez la migration "20260314150000_add_missing_roles.sql" dans Supabase.`);
        }
      }

      // 3. Upsert the profile with all metadata
      // NOTE: statut is set to 'inactif' by default — DSI must activate the account manually
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .upsert({
          user_id: newUserId,
          email: email,
          full_name: fullName,
          prenom: prenom || null,
          entreprise_id: entrepriseId || null,
          station_id: stationId || null,
          region: region || null,
          prefecture: prefecture || null,
          commune: commune || null,
          organisation: organisation || null,
          direction: direction || null,
          poste: poste || null,
          sexe: sexe || null,
          date_naissance: dateNaissance || null,
          adresse: adresse || null,
          matricule: matricule || null,
          force_password_change: forcePasswordChange || false,
          statut: 'inactif', // Compte inactif jusqu'à activation manuelle par le Service IT
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Error upserting profile:', profileError);
        // Non-fatal - role is assigned, profile can be edited later
      }

      return { error: null, userId: newUserId };
    } catch (error) {
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
      if (params.prenom) profileUpdates.prenom = params.prenom;
      if (params.email) profileUpdates.email = params.email;
      if (params.entrepriseId !== undefined) profileUpdates.entreprise_id = params.entrepriseId || null;
      if (params.stationId !== undefined) profileUpdates.station_id = params.stationId || null;
      if (params.region) profileUpdates.region = params.region;
      if (params.prefecture) profileUpdates.prefecture = params.prefecture;
      if (params.commune) profileUpdates.commune = params.commune;
      if (params.organisation) profileUpdates.organisation = params.organisation;
      if (params.direction) profileUpdates.direction = params.direction;
      if (params.poste) profileUpdates.poste = params.poste;
      if (params.sexe) profileUpdates.sexe = params.sexe;
      if (params.dateNaissance) profileUpdates.date_naissance = params.dateNaissance;
      if (params.adresse) profileUpdates.adresse = params.adresse;
      if (params.matricule) profileUpdates.matricule = params.matricule;
      if (params.forcePasswordChange !== undefined) profileUpdates.force_password_change = params.forcePasswordChange;

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
        const { error: roleUpdateError, count } = await (supabase as any)
          .from('user_roles')
          .update({ role: params.role })
          .eq('user_id', userId);

        if (roleUpdateError) {
          // Fallback: delete and re-insert
          await (supabase as any).from('user_roles').delete().eq('user_id', userId);
          const { error: roleInsertError } = await (supabase as any)
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
    isSessionLocked,
    lockSession,
    unlockSession,
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
    canManageStations,
    canManageEntreprises,
  }), [
    user, session, profile, role, loading, hasProfile, hasRole,
    signIn, signUp, signOut, isSessionLocked, unlockSession,
    canAccess, hasAnyRole, createUser,
    updateUser, deleteUser, resetPasswordForEmail, updatePassword,
    getDashboardRoute, isReadOnly, canManageUsers, canAddObservation, canModifyData,
    canManageStations, canManageEntreprises,
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
  super_admin: 'Super Administrateur National (DSI)',
  directeur_general: 'Directeur Général (Régulation État)',
  directeur_adjoint: 'Directeur Général Adjoint (Régulation État)',
  admin_etat: 'Administrateur Central État (Régulation)',
  secretaire_general: 'Secrétaire Général (Administration Centrale)',
  directeur_aval: 'Directeur des Services Aval (DSA)',
  directeur_adjoint_aval: 'Directeur Adjoint des Services Aval',
  chef_division_distribution: 'Chef de Division Distribution',
  chef_bureau_aval: 'Chef de Bureau Aval',
  agent_supervision_aval: 'Agent de Supervision Aval',
  controleur_distribution: 'Contrôleur de Distribution',
  technicien_support_dsa: 'Technicien Support DSA',
  technicien_flux: 'Technicien Flux Opérationnels',
  inspecteur: 'Corps des Inspecteurs (Contrôle & Audit)',
  service_it: 'Direction des Systèmes Informatiques (DSI)',
  responsable_entreprise: 'Directeur Entreprise Pétrolière',
  responsable_stations: 'Responsable Stations-Service (Entreprise)',
  gestionnaire_livraisons: 'Gestionnaire Livraisons (Entreprise)',
  operateur_entreprise: 'Opérateur Logistique (Entreprise)',

  directeur_importation: 'Directeur Importation / Approvisionnement',
  agent_importation: 'Agent Importation (Suivi Flux)',
  responsable_stock: 'Responsable Stock Station',
  agent_station: 'Agent de Station',
  technicien_aval: 'Technicien Services Aval (DSA)',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Autorité technique la plus élevée du système SIHG (DSI). Administration de toute la plateforme, gestion des comptes, serveurs et sécurité. Ne modifie pas les données métier.',
  directeur_general: 'Directeur Général de la SONAP. Autorité nationale de régulation. Consultation stratégique de toutes les données. Ne crée pas de stations ni ne gère la logistique.',
  directeur_adjoint: 'Directeur Général Adjoint. Supervision nationale. Consultation des rapports stratégiques et suivi des performances. Pas de gestion opérationnelle.',
  admin_etat: 'Administrateur Central État. Création et validation des entreprises et stations-service. Gestion administrative du secteur pétrolier.',
  secretaire_general: 'Secrétaire Général. Coordination administrative et préparation des dossiers de régulation. Consultation des entreprises, stations et rapports.',
  directeur_aval: 'Responsable national du secteur aval. Supervise toutes les entreprises, stations, distribution et quotas.',
  directeur_adjoint_aval: 'Assiste le directeur et gère les opérations quotidiennes de la Direction des Services Aval.',
  chef_division_distribution: 'Gère la distribution du carburant vers les entreprises et affecte les volumes.',
  chef_bureau_aval: 'Supervise les agents et contrôleurs sur le terrain et organise les missions de contrôle.',
  agent_supervision_aval: 'Observe et surveille les stations-service, confirme les réceptions et signale les anomalies.',
  controleur_distribution: 'Vérifie que les entreprises respectent les quotas et détecte les dépassements.',
  technicien_support_dsa: 'Gère les problèmes techniques du système et aide les utilisateurs du module Aval.',
  technicien_flux: 'Suit les flux de carburant entre les dépôts, les entreprises et les stations.',
  inspecteur: 'Agent de contrôle du secteur pétrolier. Inspection des stations, vérification des stocks et des prix officiels.',
  service_it: 'Ingénieurs DSI. Maintenance technique, gestion des serveurs, base de données, réseau et support technique. Ne modifie pas les données pétrolières.',
  responsable_entreprise: 'Directeur de compagnie pétrolière agréée. Supervise les stations, stocks et livraisons de son entreprise. Ne modifie ni prix ni quotas.',
  responsable_stations: 'Responsable Stations-Service. Surveille les stocks, signale les ruptures et suit l\'activité des stations de son entreprise.',
  gestionnaire_livraisons: 'Gestionnaire Livraisons. Enregistre les départs de camions, suit les livraisons et confirme la réception du carburant.',
  operateur_entreprise: 'Opérateur logistique de l\'entreprise. Organise les camions citernes et planifie les livraisons.',

  directeur_importation: 'Supervise le processus d’achat et d’arrivée des produits pétroliers.',
  agent_importation: 'Saisie des informations de cargaison et suivi des navires pétroliers.',
  responsable_stock: 'Gestion locale des stocks au niveau d\'une station pétrolière.',
  agent_station: 'Personnel de service en station-service.',
  technicien_aval: 'Expert technique pour le support et le déploiement des outils de suivi Aval.',
};
