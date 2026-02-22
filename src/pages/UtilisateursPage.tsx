import { useState, useEffect } from 'react';
import { Search, Plus, Shield, Building2, Fuel, MoreHorizontal, Edit, Trash2, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  email: string;
  phone?: string;
  created_at: string;
  role: AppRole;
  entreprise_id?: string;
  entreprise_nom?: string;
  station_nom?: string;
}

const roleColors: Partial<Record<AppRole, string>> = {
  super_admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  admin_etat: 'bg-blue-100 text-blue-700 border-blue-200',
  inspecteur: 'bg-teal-100 text-teal-700 border-teal-200',
  analyste: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  personnel_admin: 'bg-gray-100 text-gray-700 border-gray-200',
  service_it: 'bg-slate-100 text-slate-700 border-slate-200',
  responsable_entreprise: 'bg-amber-100 text-amber-700 border-amber-200',
  gestionnaire_station: 'bg-orange-100 text-orange-700 border-orange-200',
};

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
    setLoading(true);
    try {
      let profileQuery = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          created_at,
          entreprise_id,
          station_id
        `);

      // Filter by company if the user is a Responsable Entreprise
      if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id) {
        profileQuery = profileQuery.eq('entreprise_id', currentUserProfile.entreprise_id);
      }

      // Run all queries in parallel for faster loading
      const [profilesRes, rolesRes, entreprisesRes, stationsRes] = await Promise.all([
        profileQuery.order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('entreprises').select('id, nom'),
        supabase.from('stations').select('id, nom'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const entreprises = entreprisesRes.data || [];
      const stations = stationsRes.data || [];

      // Build lookup maps for O(1) access instead of O(n) find()
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
      const entrepriseMap = new Map(entreprises.map(e => [e.id, e.nom]));
      const stationMap = new Map(stations.map(s => [s.id, s.nom]));

      // Map profiles with roles and names
      const usersWithDetails: UserWithDetails[] = profiles.map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || undefined,
        created_at: profile.created_at,
        role: (roleMap.get(profile.user_id) as AppRole) || 'responsable_entreprise',
        entreprise_id: profile.entreprise_id || undefined,
        entreprise_nom: profile.entreprise_id ? entrepriseMap.get(profile.entreprise_id) : undefined,
        station_nom: profile.station_id ? stationMap.get(profile.station_id) : undefined,
      }));

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const usersByRole: Record<string, number> = {};
  (Object.keys(ROLE_LABELS) as AppRole[]).forEach(r => {
    usersByRole[r] = users.filter(u => u.role === r).length;
  });

  const canCreateUser = currentUserRole === 'super_admin' || currentUserRole === 'service_it';

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

  return (
    <DashboardLayout
      title="Utilisateurs"
      subtitle="Gestion des accès et des rôles"
    >
      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note :</strong> Les inscriptions publiques sont désactivées. Seuls les administrateurs peuvent créer de nouveaux comptes utilisateurs.
        </p>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map(role => (
          <Card key={role} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedRole(role)}>
            <CardContent className="p-4 text-center">
              <Shield className={cn(
                "h-5 w-5",
                role === 'super_admin' ? 'text-purple-600' :
                  role === 'inspecteur' ? 'text-teal-600' :
                    role === 'service_it' ? 'text-slate-600' :
                      'text-amber-600'
              )} />
              <p className="text-2xl font-bold">{usersByRole[role]}</p>
              <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {(Object.keys(ROLE_LABELS) as AppRole[]).map(role => (
              <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>

        {canCreateUser && (
          <Button className="gap-2" onClick={() => {
            setUserToEdit(null);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {user.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{user.full_name}</h3>
                        <Badge variant="outline" className={cn("text-[10px]", roleColors[user.role])}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>

                      {(user.entreprise_nom || user.station_nom) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {user.entreprise_nom && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {user.entreprise_nom}
                            </span>
                          )}
                          {user.station_nom && (
                            <span className="flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {user.station_nom}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {canCreateUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => handleEdit(user)}>
                            <Edit className="h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => handleDelete(user.user_id, user.full_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Hiérarchie des Rôles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((role, index) => (
              <div key={role} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                    role === 'super_admin' ? 'bg-purple-500' :
                      role === 'admin_etat' ? 'bg-blue-500' :
                        role === 'inspecteur' ? 'bg-teal-500' :
                          role === 'analyste' ? 'bg-cyan-500' :
                            role === 'service_it' ? 'bg-slate-500' :
                              'bg-amber-500'
                  )}>
                    {index + 1}
                  </div>
                  {index < Object.keys(ROLE_LABELS).length - 1 && <div className="w-0.5 h-8 bg-border" />}
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-medium">{ROLE_LABELS[role]}</h4>
                  <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
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
          role: userToEdit.role,
          phone: userToEdit.phone,
          entreprise_id: userToEdit.entreprise_id
        } : undefined}
      />
    </DashboardLayout>
  );
}
