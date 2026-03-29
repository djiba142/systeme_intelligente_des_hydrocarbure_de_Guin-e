import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Shield, 
  Building2, 
  Fuel, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RefreshCw,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, AppRole, useAuth } from '@/contexts/AuthContext';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UserWithDetails {
  id: string;
  user_id: string;
  full_name: string;
  prenom?: string;
  email: string;
  phone?: string;
  created_at: string;
  role?: AppRole;
  entreprise_id?: string;
  entreprise_nom?: string;
  station_id?: string;
  station_nom?: string;
  organisation?: string;
  direction?: string;
  poste?: string;
  matricule?: string;
  sexe?: 'M' | 'F';
  date_naissance?: string;
  region?: string;
  prefecture?: string;
  commune?: string;
  force_password_change?: boolean;
  statut?: 'inactif' | 'actif' | 'suspendu';
}

const ORG_LABELS: Record<string, string> = {
  admin_central: 'Administration Centrale',
  dsi: 'Direction des Systèmes Informatiques (DSI)',
  dsa: 'Direction des Services Aval',
  inspecteurs: 'Inspecteurs SONAP',
  importation: 'Direction Importation / Approvisionnement',
  entreprises: 'Siège Entreprise',
};

const roleTheme: Record<AppRole, { color: string; bg: string; border: string; iconColor: string }> = {
  super_admin: { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', iconColor: 'text-indigo-600' },
  directeur_general: { color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-300', iconColor: 'text-slate-900' },
  directeur_adjoint: { color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200', iconColor: 'text-slate-800' },
  admin_etat: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
  directeur_aval: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
  directeur_adjoint_aval: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
  chef_division_distribution: { color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200', iconColor: 'text-emerald-500' },
  chef_bureau_aval: { color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', iconColor: 'text-teal-600' },
  agent_supervision_aval: { color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-teal-100', iconColor: 'text-teal-500' },
  controleur_distribution: { color: 'text-teal-500', bg: 'bg-teal-50/30', border: 'border-teal-100/50', iconColor: 'text-teal-400' },
  technicien_support_dsa: { color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', iconColor: 'text-emerald-500' },
  technicien_flux: { color: 'text-emerald-500', bg: 'bg-emerald-50/30', border: 'border-emerald-100/50', iconColor: 'text-emerald-400' },
  inspecteur: { color: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200', iconColor: 'text-lime-600' },
  service_it: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', iconColor: 'text-purple-600' },
  responsable_entreprise: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
  secretaire_general: { color: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300', iconColor: 'text-blue-700' },
  responsable_stations: { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', iconColor: 'text-amber-600' },
  gestionnaire_livraisons: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', iconColor: 'text-orange-600' },
  operateur_entreprise: { color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100', iconColor: 'text-amber-500' },

  directeur_importation: { color: 'text-indigo-900', bg: 'bg-indigo-50', border: 'border-indigo-300', iconColor: 'text-indigo-800' },
  agent_importation: { color: 'text-indigo-700', bg: 'bg-indigo-50/50', border: 'border-indigo-100', iconColor: 'text-indigo-600' },
  responsable_stock: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
  agent_station: { color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', iconColor: 'text-emerald-500' },
  technicien_aval: { color: 'text-emerald-500', bg: 'bg-emerald-50/30', border: 'border-emerald-100', iconColor: 'text-emerald-400' },
};

const DEFAULT_THEME = { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', iconColor: 'text-slate-600' };

export default function UtilisateursPage() {
  const { role: currentUserRole, profile: currentUserProfile, deleteUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithDetails | null>(null);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [currentUserRole, currentUserProfile?.entreprise_id]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profError) {
        toast({ title: "Accès refusé", description: "Vérifiez vos permissions RLS sur la table 'profiles'.", variant: "destructive" });
        return;
      }

      // Fetch user roles
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const { data: ents } = await supabase.from('entreprises').select('id, nom');
      const { data: stats } = await supabase.from('stations').select('id, nom');

      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
      const entMap = new Map((ents || []).map(e => [e.id, e.nom]));
      const statMap = new Map((stats || []).map(s => [s.id, s.nom]));

      const usersWithDetails: UserWithDetails[] = (profiles as any[] || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        prenom: p.prenom || undefined,
        email: p.email,
        phone: p.phone || undefined,
        created_at: p.created_at,
        role: roleMap.get(p.user_id) as AppRole | undefined,
        entreprise_id: p.entreprise_id || undefined,
        entreprise_nom: entMap.get(p.entreprise_id),
        station_id: p.station_id || undefined,
        station_nom: statMap.get(p.station_id),
        organisation: p.organisation || undefined,
        direction: p.direction || undefined,
        poste: p.poste || undefined,
        matricule: p.matricule || undefined,
        sexe: p.sexe || undefined,
        date_naissance: p.date_naissance || undefined,
        region: p.region || undefined,
        prefecture: p.prefecture || undefined,
        commune: p.commune || undefined,
        force_password_change: p.force_password_change || false,
        statut: (p.statut as 'inactif' | 'actif' | 'suspendu') || 'actif',
      }));

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // 1. Security/Privacy Filter: Users only see what concerns them
    if (currentUserRole === 'responsable_entreprise') {
      // Les responsables d'entreprise ne voient que leur personnel
      if (user.entreprise_id !== currentUserProfile?.entreprise_id) return false;
    } else if (currentUserRole === 'directeur_aval' || currentUserRole === 'directeur_adjoint_aval' || currentUserRole === 'chef_division_distribution') {
      // La DSA voit le terrain et les entreprises, mais pas le top management SONAP ou la DSI
      const sensitiveRoles: AppRole[] = ['super_admin', 'service_it', 'directeur_general', 'directeur_adjoint', 'admin_etat'];
      if (user.role && sensitiveRoles.includes(user.role)) return false;
    } else if (currentUserRole === 'directeur_importation') {
      // L'Import voit son pôle
      const impRoles: AppRole[] = ['directeur_importation', 'agent_importation'];
      if (user.role && !impRoles.includes(user.role)) return false;
    }

    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole || (selectedRole === 'none' && !user.role);
    return matchesSearch && matchesRole;
  });

  const usersByRole: Record<string, number> = {};
  (Object.keys(ROLE_LABELS) as AppRole[]).forEach(r => {
    usersByRole[r] = users.filter(u => u.role === r).length;
  });
  const usersWithoutRole = users.filter(u => !u.role).length;

  const canCreateUser = 
    currentUserRole === 'super_admin' || 
    currentUserRole === 'directeur_general' || 
    currentUserRole === 'directeur_adjoint' || 
    currentUserRole === 'admin_etat' || 
    currentUserRole === 'directeur_aval' || 
    currentUserRole === 'directeur_adjoint_aval' ||
    currentUserRole === 'service_it' ||
    currentUserRole === 'directeur_importation';

  const handleEdit = (user: UserWithDetails) => {
    setUserToEdit(user);
    setCreateDialogOpen(true);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${name} ?`)) {
      return;
    }

    try {
      const { error } = await deleteUser(userId);
      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: `L'utilisateur ${name} a été supprimé avec succès.`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
      });
    }
  };

  // Activation manuelle d'un compte inactif (DSI / Super Admin uniquement)
  const canActivateAccounts = currentUserRole === 'super_admin' || currentUserRole === 'service_it';

  const handleActivateUser = async (userId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ statut: 'actif' } as any)
        .eq('user_id', userId);
      if (error) throw error;
      toast({
        title: 'Compte activé ✅',
        description: `Le compte de ${name} est maintenant actif. L'utilisateur peut se connecter.`,
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'activation',
        description: err.message || 'Impossible d\'activer le compte',
      });
    }
  };

  const pendingCount = users.filter(u => u.statut === 'inactif').length;

  return (
    <DashboardLayout
      title="Gestion des Utilisateurs"
      subtitle="Contrôle des accès et hiérarchie de la plateforme"
    >
      <div className="space-y-8">

        {/* Bandeau d'alerte - Comptes en attente d'activation */}
        {canActivateAccounts && pendingCount > 0 && (
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-orange-50 border-2 border-orange-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-md">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-orange-700">
                  {pendingCount} compte{pendingCount > 1 ? 's' : ''} en attente d'activation
                </p>
                <p className="text-[11px] text-orange-500">
                  Ces utilisateurs ne peuvent pas se connecter tant que leur compte n'est pas activé manuellement.
                </p>
              </div>
            </div>
            <Badge className="bg-orange-500 text-white border-orange-600 font-black text-sm px-3 py-1">
              {pendingCount}
            </Badge>
          </div>
        )}
        {/* Top Branding Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 border-none text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-white/90">Effectif Global</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black">{users.length}</span>
                <span className="text-primary/70 text-sm font-bold uppercase tracking-widest italic">Comptes</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[9px] font-black cursor-pointer hover:bg-white/20" onClick={() => setSelectedRole('all')}>TOUS LES ACCÈS</Badge>
                {usersWithoutRole > 0 && (
                  <Badge variant="destructive" className="animate-pulse text-[9px] font-black cursor-pointer shadow-lg shadow-red-500/20" onClick={() => setSelectedRole('none')}>
                    {usersWithoutRole} SANS RÔLE
                  </Badge>
                )}
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="h-24 w-24 -mr-6 -mt-6" />
            </div>
          </Card>

          <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/50 transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" onClick={() => setSelectedRole('directeur_aval')}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800">
                    <Activity className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50/50">DSA</Badge>
                </div>
                <p className="text-2xl font-black">{(usersByRole['directeur_aval'] || 0) + (usersByRole['directeur_adjoint_aval'] || 0) + (usersByRole['chef_division_distribution'] || 0)}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Services Aval</p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" onClick={() => setSelectedRole('responsable_entreprise')}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-100 dark:border-orange-800">
                    <Fuel className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-700 bg-orange-50/50">TERRAIN</Badge>
                </div>
                <p className="text-2xl font-black">{(usersByRole['responsable_entreprise'] || 0) + (usersByRole['operateur_entreprise'] || 0)}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Entreprises</p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" onClick={() => setSelectedRole('directeur_general')}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800">
                    <Shield className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50/50">SONAP</Badge>
                </div>
                <p className="text-2xl font-black">{(usersByRole['directeur_general'] || 0) + (usersByRole['directeur_adjoint'] || 0) + (usersByRole['admin_etat'] || 0) + (usersByRole['directeur_importation'] || 0)}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Management & Directions</p>
              </CardContent>
            </Card>
            
            <Card className="hover:border-primary/50 transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" onClick={() => setSelectedRole('inspecteur')}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-lime-50 dark:bg-lime-900/20 text-lime-600 border border-lime-100 dark:border-lime-800">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-lime-200 text-lime-700 bg-lime-50/50">AUDIT</Badge>
                </div>
                <p className="text-2xl font-black">{usersByRole['inspecteur'] || 0}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Inspecteurs</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-[220px] h-12 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map(role => (
                  <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-slate-200 dark:border-slate-800" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={cn("h-5 w-5 text-slate-500", loading && "animate-spin")} />
            </Button>

            {canCreateUser && (
              <Button className="h-12 gap-2 rounded-xl px-6 bg-slate-900 hover:bg-black text-white dark:bg-primary dark:hover:bg-primary/90 transition-all active:scale-95 shadow-lg" onClick={() => {
                setUserToEdit(null);
                setCreateDialogOpen(true);
              }}>
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline font-bold">Ajouter un Utilisateur</span>
              </Button>
            )}
          </div>
        </div>

        {/* User Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[200px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))
          ) : (
            filteredUsers.map(user => {
              const theme = (user.role && roleTheme[user.role]) ? roleTheme[user.role] : DEFAULT_THEME;
              return (
                <Card 
                  key={user.id} 
                  className="group relative overflow-hidden border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 bg-white dark:bg-slate-900 rounded-2xl"
                >
                  <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-5 group-hover:opacity-10 transition-opacity", theme.bg)} />
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="h-14 w-14 ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm">
                        <AvatarFallback className={cn("text-lg font-black text-white bg-gradient-to-br", theme.bg.replace('50', '500'))}>
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      {canCreateUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-slate-200 dark:border-slate-800">
                            <DropdownMenuItem className="gap-2 rounded-lg py-2" onClick={() => handleEdit(user)}>
                              <Edit className="h-4 w-4" />
                              Modifier le profil
                            </DropdownMenuItem>
                            {(currentUserRole === 'service_it' || currentUserRole === 'super_admin') && (
                              <DropdownMenuItem className="gap-2 rounded-lg py-2 text-blue-600" onClick={() => {
                                if (confirm(`Envoyer un lien de réinitialisation à ${user.email} ?`)) {
                                  supabase.auth.resetPasswordForEmail(user.email);
                                  toast({ title: "Lien envoyé", description: "Le lien de réinitialisation a été envoyé." });
                                }
                              }}>
                                <RefreshCw className="h-4 w-4" />
                                Réinitialiser Password
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem 
                              className="gap-2 rounded-lg py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                              onClick={() => handleDelete(user.user_id, user.full_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer l'accès
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="space-y-1 mb-4">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                        {user.full_name}
                      </h3>
                      {user.matricule && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] px-2 py-0.5">
                            ID: {user.matricule}
                          </Badge>
                        </div>
                      )}
                      {user.poste && (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-2 italic">
                          {user.poste}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-bold", theme.color, theme.bg, theme.border)}>
                          {user.role ? ROLE_LABELS[user.role] : 'Non défini'}
                        </Badge>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                        {user.organisation && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 w-fit max-w-full">
                            <Shield className="h-3 w-3" />
                            <span className="truncate uppercase">{ORG_LABELS[user.organisation] || user.organisation}{user.direction ? ` — ${user.direction}` : ''}</span>
                          </div>
                        )}
                      
                      {user.poste && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800 w-fit max-w-full">
                          <UserCheck className="h-3 w-3" />
                          <span className="truncate uppercase">{user.poste}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2">
                        {user.entreprise_nom && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 w-fit max-w-full">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span className="truncate">{user.entreprise_nom}</span>
                          </div>
                        )}
                        {user.station_nom && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 w-fit max-w-full">
                            <Fuel className="h-3 w-3 text-slate-400" />
                            <span className="truncate">{user.station_nom}</span>
                          </div>
                        )}
                        {(!user.organisation && !user.entreprise_nom && !user.station_nom) && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 italic">
                            <AlertCircle className="h-3 w-3 opacity-50" />
                            Aucune affectation
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/20 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      {user.statut === 'inactif' ? (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">En attente d'activation</span>
                        </>
                      ) : user.statut === 'suspendu' ? (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Compte suspendu</span>
                        </>
                      ) : (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Compte actif</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-slate-400">
                        ID: {user.user_id.slice(0, 8)}...
                      </span>
                      {user.statut === 'inactif' && canActivateAccounts && (
                        <Button
                          size="sm"
                          className="h-6 text-[10px] uppercase font-bold tracking-wider px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleActivateUser(user.user_id, user.full_name)}
                        >
                          Activer
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Users className="h-10 w-10 opacity-20" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Aucun résultat</p>
              <p className="text-slate-500">Essayez une autre recherche ou modifiez les filtres.</p>
            </div>
            <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedRole('all'); }}>
              Réinitialiser
            </Button>
          </div>
        )}

        {/* Hierarchy Section */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Structure d'Autorité</CardTitle>
                <CardDescription>Rôles et permissions au sein du SIHG</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(Object.keys(ROLE_LABELS) as AppRole[]).map((role, index) => {
                const theme = roleTheme[role] || DEFAULT_THEME;
                return (
                  <div key={role} className="flex gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800/20 p-3 rounded-2xl transition-all">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg transition-transform group-hover:scale-110",
                        "bg-gradient-to-br",
                        role === 'super_admin' ? 'from-indigo-500 to-indigo-700' :
                        role === 'admin_etat' ? 'from-blue-500 to-blue-700' :
                         role === 'directeur_aval' ? 'from-emerald-500 to-emerald-700' :
                         role === 'directeur_adjoint_aval' ? 'from-emerald-500 to-emerald-700' :
                         role === 'chef_division_distribution' ? 'from-emerald-400 to-emerald-600' :
                         role === 'chef_bureau_aval' ? 'from-teal-500 to-teal-700' :
                         role === 'agent_supervision_aval' ? 'from-teal-400 to-teal-600' :
                         role === 'inspecteur' ? 'from-lime-500 to-lime-700' :
                         role === 'service_it' ? 'from-purple-500 to-purple-700' :
                        'from-amber-500 to-amber-700'
                      )}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wide text-[10px]">
                        {ROLE_LABELS[role]}
                        <UserCheck className={cn("h-3 w-3", theme.iconColor)} />
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setUserToEdit(null);
        }}
        onUserCreated={fetchUsers}
        initialData={userToEdit ? {
          user_id: userToEdit.user_id,
          email: userToEdit.email,
          full_name: userToEdit.full_name,
          prenom: userToEdit.prenom,
          role: userToEdit.role,
          phone: userToEdit.phone,
          sexe: userToEdit.sexe,
          date_naissance: userToEdit.date_naissance,
          matricule: userToEdit.matricule,
          entreprise_id: userToEdit.entreprise_id,
          station_id: userToEdit.station_id,
          organisation: userToEdit.organisation,
          direction: userToEdit.direction,
          poste: userToEdit.poste,
          region: userToEdit.region,
          prefecture: userToEdit.prefecture,
          commune: userToEdit.commune,
          force_password_change: userToEdit.force_password_change
        } : undefined}
      />
    </DashboardLayout>
  );
}
