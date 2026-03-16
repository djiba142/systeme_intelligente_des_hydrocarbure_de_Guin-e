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
  | 'directeur_aval'
  | 'directeur_adjoint_aval'
  | 'chef_division_distribution'
  | 'chef_bureau_aval'
  | 'agent_supervision_aval'
  | 'controleur_distribution'
  | 'technicien_support_dsa'
  | 'technicien_flux'
  | 'inspecteur'
  | 'analyste'
  | 'personnel_admin'
  | 'service_it'
  | 'responsable_entreprise'
  | 'operateur_entreprise'
  | 'directeur_juridique'
  | 'juriste'
  | 'charge_conformite'
  | 'assistant_juridique'
  | 'directeur_financier'
  | 'controleur_financier'
  | 'comptable'
  | 'directeur_importation'
  | 'agent_importation'
  | 'directeur_logistique'
  | 'agent_logistique';     // Nouveau : Logistique

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
  'directeur_aval': 4,
  'directeur_adjoint_aval': 4,
  'chef_division_distribution': 5,
  'chef_bureau_aval': 6,
  'agent_supervision_aval': 7,
  'controleur_distribution': 7,
  'technicien_support_dsa': 8,
  'technicien_flux': 8,
  'inspecteur': 9,
  'analyste': 10,
  'personnel_admin': 11,
  'service_it': 1,
  'responsable_entreprise': 12,
  'operateur_entreprise': 13,
  'directeur_juridique': 4,
  'juriste': 5,
  'charge_conformite': 6,
  'assistant_juridique': 7,
  'directeur_financier': 4,
  'controleur_financier': 5,
  'comptable': 6,
  'directeur_importation': 4,
  'agent_importation': 5,
  'directeur_logistique': 4,
  'agent_logistique': 5,
};

// Rôles avec accès en lecture seule (pas de modification de données métier)
const READ_ONLY_ROLES: AppRole[] = ['inspecteur', 'analyste', 'personnel_admin', 'agent_supervision_aval', 'technicien_support_dsa'];

// Rôles pouvant gérer les utilisateurs
const USER_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 
  'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'responsable_entreprise', 
  'directeur_financier', 'directeur_importation', 'directeur_logistique', 'directeur_juridique'
];

// Rôles pouvant ajouter des observations
const OBSERVATION_ROLES: AppRole[] = ['inspecteur', 'chef_bureau_aval', 'agent_supervision_aval'];

// Rôles pouvant modifier les données métier (stocks, ventes, livraisons)
const DATA_MODIFY_ROLES: AppRole[] = [
  'directeur_aval', 
  'chef_division_distribution',
  'responsable_entreprise',
  'operateur_entreprise'
];

// Rôles pouvant gérer les stations (Créer/Modifier/Supprimer)
const STATION_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin',
  'admin_etat', 
  'directeur_general',
  'directeur_adjoint',
  'directeur_aval',
  'responsable_entreprise',
  'operateur_entreprise'
];

const ENTREPRISE_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin',
  'admin_etat',
  'directeur_general',
  'directeur_adjoint'
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

      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      if (roleResult.data) {
        setRole(roleResult.data.role as AppRole);
      } else {
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
      }
    } catch (error) {
      console.warn('Error in fetchUserData:', error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
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

  // --- INACTIVITY LOCK SYSTEM ---
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user && !isSessionLocked && !loading) {
      inactivityTimer.current = setTimeout(() => {
        setIsSessionLocked(true);
      }, 5 * 60 * 1000); // 5 minutes
    }
  }, [user, isSessionLocked, loading]);

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Log failed login attempt (best effort, no authenticated user needed)
      try {
        await (supabase as any).from('audit_logs').insert([{
          user_email: email,
          action_type: 'LOGIN',
          status: 'failed',
          error_message: error.message,
          details: { login_timestamp: new Date().toISOString() },
        }]);
      } catch { /* ignore */ }
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
        return '/dashboard/admin-etat';
      case 'inspecteur':
        return '/dashboard/inspecteur';
      case 'analyste':
        return '/dashboard/analyste';
      case 'personnel_admin':
        return '/dashboard/personnel-admin';
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
        return '/dashboard/dsa';
      case 'responsable_entreprise':
        return '/dashboard/entreprise';
      case 'directeur_juridique':
      case 'juriste':
      case 'charge_conformite':
      case 'assistant_juridique':
        return '/dashboard/juridique';
      case 'directeur_financier':
      case 'controleur_financier':
      case 'comptable':
        return '/dashboard/finance';
      case 'directeur_importation':
      case 'agent_importation':
        return '/dashboard/importation';
      case 'directeur_logistique':
      case 'agent_logistique':
        return '/dashboard/logistique';
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
  directeur_general: 'Directeur Général (Administrateur central État)',
  directeur_adjoint: 'Directeur Général Adjoint (Administrateur central État)',
  admin_etat: 'Administrateur État (Régulation)',
  directeur_aval: 'Directeur des Services Aval (DSA)',
  directeur_adjoint_aval: 'Directeur Adjoint des Services Aval',
  chef_division_distribution: 'Chef de Division Distribution',
  chef_bureau_aval: 'Chef de Bureau Aval',
  agent_supervision_aval: 'Agent de Supervision Aval',
  controleur_distribution: 'Contrôleur de Distribution',
  technicien_support_dsa: 'Technicien Support DSA',
  technicien_flux: 'Technicien Flux Opérationnels',
  inspecteur: 'Corps des Inspecteurs (Contrôle & Audit)',
  analyste: 'Cellule d’Analyse Stratégique (CAS)',
  personnel_admin: 'Personnel Administratif (Gestion & Conformité)',
  service_it: 'Direction des Systèmes Informatiques (DSI)',
  responsable_entreprise: 'Responsable Entreprise Pétrolière',
  operateur_entreprise: 'Opérateur Entreprise (Logistique)',
  directeur_juridique: 'Directeur Juridique & Conformité (DJ/C)',
  juriste: 'Juriste / Conseiller Juridique',
  charge_conformite: 'Chargé de Conformité réglementaire',
  assistant_juridique: 'Assistant Administratif DJ/C',
  directeur_financier: 'Directeur Administratif et Financier (DAF)',
  controleur_financier: 'Contrôleur Financier (DAF)',
  comptable: 'Comptable (DAF)',
  directeur_importation: 'Directeur Importation / Approvisionnement',
  agent_importation: 'Agent Importation (Suivi Flux)',
  directeur_logistique: 'Directeur Logistique & Dépôts',
  agent_logistique: 'Agent Logistique (Mouvements Stock)',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Autorité technique la plus élevée du système SIHG. Administration de toute la plateforme nationale, gestion des comptes, rôles, paramètres système, serveurs et sécurité.",
  directeur_general: 'Directeur Général de la SONAP. Administrateur central État. Autorité ultime de régulation et pilotage stratégique.',
  directeur_adjoint: 'Directeur Général Adjoint de la SONAP. Administrateur central État. Coordination opérationnelle et supervision nationale.',
  admin_etat: 'Niveau national stratégique (Régulateur). Création d\'entreprises, validation de stations et sécurité énergétique.',
  directeur_aval: 'Responsable national du secteur aval. Supervise toutes les entreprises, stations, distribution et quotas.',
  directeur_adjoint_aval: 'Assiste le directeur et gère les opérations quotidiennes de la Direction des Services Aval.',
  chef_division_distribution: 'Gère la distribution du carburant vers les entreprises et affecte les volumes.',
  chef_bureau_aval: 'Supervise les agents et contrôleurs sur le terrain et organise les missions de contrôle.',
  agent_supervision_aval: 'Observe et surveille les stations-service, confirme les réceptions et signale les anomalies.',
  controleur_distribution: 'Vérifie que les entreprises respectent les quotas et détecte les dépassements.',
  technicien_support_dsa: 'Gère les problèmes techniques du système et aide les utilisateurs du module Aval.',
  technicien_flux: 'Suit les flux de carburant entre les dépôts, les entreprises et les stations.',
  inspecteur: 'Agent de contrôle du secteur pétrolier. Inspection des stations, vérification des stocks et des prix officiels.',
  analyste: 'Analyse des données nationales. Production de rapports statistiques et prévision des risques.',
  personnel_admin: 'Chargé de la gestion documentaire et du suivi administratif de la SONAP.',
  service_it: 'Ingénieurs DSI. Maintenance technique, gestion des serveurs, base de données, réseau et support technique aux utilisateurs.',
  responsable_entreprise: 'Directeur ou Responsable de compagnie pétrolière. Gestion des stations de son réseau.',
  operateur_entreprise: 'Responsable logistique de l\'entreprise. Organisation des camions et livraisons.',
  directeur_juridique: 'Responsable de la Direction Juridique. Validation finale de la conformité légale.',
  juriste: 'Analyse juridique des dossiers, rédaction de contrats et gestion des litiges.',
  charge_conformite: 'Garant du respect des normes internes et de la réglementation nationale.',
  assistant_juridique: 'Suivi administratif et archivage légal au sein de la Direction Juridique.',
  directeur_financier: 'Responsable DAF. Pilotage du budget et validation finale des paiements.',
  controleur_financier: 'Vérification de la conformité des factures et suivi budgétaire.',
  comptable: 'Enregistrement des factures et préparation des ordres de paiement.',
  directeur_importation: 'Supervise le processus d’achat et d’arrivée des produits pétroliers.',
  agent_importation: 'Saisie des informations de cargaison et suivi des navires pétroliers.',
  directeur_logistique: 'Gère le transport, le stockage et la distribution initiale des produits aux dépôts.',
  agent_logistique: 'Enregistre les entrées/sorties de stock et planifie les transferts inter-dépôts.',
};
