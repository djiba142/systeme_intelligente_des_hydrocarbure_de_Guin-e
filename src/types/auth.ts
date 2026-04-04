import { User, Session } from '@supabase/supabase-js';
import { AppRole } from './roles';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  prenom?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
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
  entreprise_id?: string;
  station_id?: string;
  last_session_id?: string;
}

export interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  prenom?: string;
  role: AppRole;
  phone?: string;
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
  entreprise_id?: string;
  station_id?: string;
}

export interface AuthContextType {
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
  canManageEntreprises: boolean;
  canManageStations: boolean;
}
