import { useEffect, useState, useCallback } from 'react';
import {
    Server, Shield, Users, Settings, Activity, Database,
    Key, RefreshCw, CheckCircle2, AlertTriangle, Lock,
    Monitor, HardDrive, Terminal, Wifi, Clock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserProfile {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    created_at: string;
}

interface UserRoleRow {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
}

export default function DashboardServiceIT() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('user_roles').select('*'),
            ]);

            setUsers((usersRes.data || []) as UserProfile[]);
            setUserRoles((rolesRes.data || []) as UserRoleRow[]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getUserRole = (userId: string) => {
        const ur = userRoles.find(r => r.user_id === userId);
        return ur?.role || 'non_assigné';
    };

    const roleCounts = userRoles.reduce<Record<string, number>>((acc, r) => {
        acc[r.role] = (acc[r.role] || 0) + 1;
        return acc;
    }, {});

    const systemHealth = [
        { name: 'Base de données (Supabase)', status: 'operational', uptime: 100 },
        { name: 'Auth Server', status: 'operational', uptime: 100 },
        { name: 'Edge Functions', status: 'operational', uptime: 99.9 },
        { name: 'Stockage (Buckets)', status: 'operational', uptime: 100 },
        { name: 'API REST', status: 'operational', uptime: 99.99 },
        { name: 'Realtime', status: 'operational', uptime: 99.5 },
    ];

    const roleLabels: Record<string, string> = {
        super_admin: 'Super Admin',
        admin_etat: 'Admin État',
        inspecteur: 'Inspecteur',
        analyste: 'Analyste',
        personnel_admin: 'Personnel Admin',
        service_it: 'Service IT',
        responsable_entreprise: 'Resp. Entreprise',
        gestionnaire_station: 'Gest. Station',
    };

    return (
        <DashboardLayout
            title="Service Informatique"
            subtitle="Administration système et maintenance technique"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Terminal className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">Console d'Administration</h2>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Actualiser
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Utilisateurs" value={users.length} subtitle="comptes créés" icon={Users} />
                <StatCard title="Rôles Assignés" value={userRoles.length} subtitle="associations" icon={Key} />
                <StatCard title="Services" value={systemHealth.length} subtitle="surveillés" icon={Server} variant="primary" />
                <StatCard title="Uptime" value="99.9%" subtitle="disponibilité" icon={Activity} variant="success" />
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        Comptes Utilisateurs
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Rôles & Permissions
                    </TabsTrigger>
                    <TabsTrigger value="system" className="gap-2">
                        <Monitor className="h-4 w-4" />
                        Monitoring Système
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Users */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Comptes Utilisateurs ({users.length})
                            </CardTitle>
                            <CardDescription>Liste des comptes enregistrés dans le système</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-4 font-medium">Nom</th>
                                            <th className="text-left py-3 px-4 font-medium">Email</th>
                                            <th className="text-center py-3 px-4 font-medium">Rôle</th>
                                            <th className="text-right py-3 px-4 font-medium">Créé le</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 font-medium">{u.full_name}</td>
                                                <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                                                <td className="text-center py-3 px-4">
                                                    <Badge variant="outline" className="text-xs">
                                                        {roleLabels[getUserRole(u.user_id)] || getUserRole(u.user_id)}
                                                    </Badge>
                                                </td>
                                                <td className="text-right py-3 px-4 text-muted-foreground text-xs">
                                                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Roles */}
                <TabsContent value="roles">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Distribution des Rôles
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(roleLabels).map(([key, label]) => {
                                    const count = roleCounts[key] || 0;
                                    const max = Math.max(...Object.values(roleCounts), 1);
                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="text-sm w-32 truncate">{label}</span>
                                            <Progress value={(count / max) * 100} className="h-2 flex-1" />
                                            <span className="text-sm font-bold w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    Matrice des Permissions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">Rôle</th>
                                                <th className="text-center py-2 px-1">Lire</th>
                                                <th className="text-center py-2 px-1">Modifier</th>
                                                <th className="text-center py-2 px-1">Observer</th>
                                                <th className="text-center py-2 px-1">Users</th>
                                                <th className="text-center py-2 px-1">Tech</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { role: 'Inspecteur', read: true, write: false, observe: true, users: false, tech: false },
                                                { role: 'Analyste', read: true, write: false, observe: false, users: false, tech: false },
                                                { role: 'Personnel Admin', read: true, write: false, observe: false, users: false, tech: false },
                                                { role: 'Service IT', read: false, write: false, observe: false, users: true, tech: true },
                                                { role: 'Super Admin', read: true, write: true, observe: true, users: true, tech: true },
                                            ].map((r, i) => (
                                                <tr key={i} className="border-b hover:bg-muted/30">
                                                    <td className="py-2 px-2 font-medium">{r.role}</td>
                                                    <td className="text-center py-2 px-1">{r.read ? '✅' : '❌'}</td>
                                                    <td className="text-center py-2 px-1">{r.write ? '✅' : '❌'}</td>
                                                    <td className="text-center py-2 px-1">{r.observe ? '✅' : '❌'}</td>
                                                    <td className="text-center py-2 px-1">{r.users ? '✅' : '❌'}</td>
                                                    <td className="text-center py-2 px-1">{r.tech ? '✅' : '❌'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: System */}
                <TabsContent value="system">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-primary" />
                                    Santé des Services
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {systemHealth.map((service, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium">{service.name}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-50">
                                                {service.uptime}%
                                            </Badge>
                                        </div>
                                        <Progress value={service.uptime} className="h-1.5" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-primary" />
                                    Ressources Système
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>CPU</span>
                                        <span className="font-medium text-emerald-600">12%</span>
                                    </div>
                                    <Progress value={12} className="h-2" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Mémoire</span>
                                        <span className="font-medium text-blue-600">45%</span>
                                    </div>
                                    <Progress value={45} className="h-2" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Stockage</span>
                                        <span className="font-medium text-amber-600">62%</span>
                                    </div>
                                    <Progress value={62} className="h-2" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Bande passante</span>
                                        <span className="font-medium text-emerald-600">8%</span>
                                    </div>
                                    <Progress value={8} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
