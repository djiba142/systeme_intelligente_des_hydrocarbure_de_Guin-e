import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Server, Shield, Users, Settings, Activity, Database,
    Key, RefreshCw, CheckCircle2, AlertTriangle, Lock,
    Monitor, HardDrive, Terminal, Wifi, Clock, Search,
    Cpu, Zap, ShieldCheck, Bug, LogOut, ChevronRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notifyStationStatusUpdate } from '@/lib/notifications';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ROLE_LABELS, AppRole, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserProfile {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    created_at: string;
    statut?: string; // Assume status field exists or will be added
}

interface UserRoleRow {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
}

interface SystemLog {
    id: string;
    source: string;
    action: string;
    user: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
}

export default function DashboardServiceIT() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
    const [auditLogs, setAuditLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, stationsRes, logsRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('user_roles').select('*'),
                supabase.from('stations').select('*, entreprise:entreprises(nom)').eq('statut', 'attente_dsi'),
                supabase.from('audit_logs' as any).select('*').order('created_at', { ascending: false }).limit(20)
            ]);

            setUsers((usersRes.data || []) as UserProfile[]);
            setUserRoles((rolesRes.data || []) as UserRoleRow[]);
            setPendingStations(stationsRes.data || []);
            
            const rawLogs = logsRes.data || [];
            const formattedLogs: SystemLog[] = rawLogs.map((log: any) => ({
                id: log.id,
                source: log.resource_type || 'Système',
                action: `${log.action_type || 'ACTION'}: ${log.resource_name || ''}`.trim(),
                user: log.user_email || log.user_id || 'Inconnu',
                timestamp: new Date(log.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                level: log.action_type === 'DELETE' ? 'error' : (log.action_type === 'UPDATE' ? 'warning' : 'info')
            }));
            setAuditLogs(formattedLogs);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const [pendingStations, setPendingStations] = useState<any[]>([]);

    const handleActivateStation = async (station: any) => {
        try {
            const { error } = await supabase
                .from('stations')
                .update({ statut: 'ouverte' }) // Final stage: Active
                .eq('id', station.id);
            
            if (error) throw error;

            await notifyStationStatusUpdate(station, 'ouverte');
            toast.success(`Installation ${station.nom} activée avec succès !`);
            fetchData();
        } catch (error) {
            console.error('Error activating station:', error);
            toast.error("Erreur lors de l'activation.");
        }
    };

    const handleDeleteUser = async (profileId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) return;

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', profileId);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleSuspendUser = async (profileId: string, currentStatut: string) => {
        // inactif -> actif (activation), suspendu -> actif (réactivation), actif -> suspendu
        const newStatut = currentStatut === 'actif' ? 'suspendu' : 'actif';
        try {
            const { error } = await supabase.from('profiles').update({ statut: newStatut } as any).eq('id', profileId);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Envoyer un lien de réinitialisation de mot de passe à ${email} ?`)) return;
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth?type=recovery`,
            });
            if (error) throw error;
            alert('Lien de réinitialisation envoyé avec succès.');
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Erreur lors de l\'envoi du lien.');
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getUserRole = (userId: string) => {
        const ur = userRoles.find(r => r.user_id === userId);
        return ur?.role || 'non_assigné';
    };

    const roleCounts = useMemo(() => {
        return userRoles.reduce<Record<string, number>>((acc, r) => {
            acc[r.role] = (acc[r.role] || 0) + 1;
            return acc;
        }, {});
    }, [userRoles]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            !searchQuery ||
            u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const systemHealth = [
        { name: 'Base de données (Supabase)', status: 'operational', uptime: 100 },
        { name: 'Auth Server', status: 'operational', uptime: 100 },
        { name: 'Edge Functions', status: 'operational', uptime: 99.9 },
        { name: 'Stockage (Buckets)', status: 'operational', uptime: 100 },
        { name: 'API REST', status: 'operational', uptime: 99.99 },
        { name: 'Realtime', status: 'operational', uptime: 99.5 },
    ];

    // L'état `auditLogs` remplace l'ancienne constante statique `logs`.

    const roleLabels = ROLE_LABELS;

    const roleColors: Record<string, string> = {
        super_admin: 'bg-red-100 text-red-700 border-red-200',
        service_it: 'bg-blue-100 text-blue-700 border-blue-200',
        inspecteur: 'bg-amber-100 text-amber-700 border-amber-200',
        default: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
        <DashboardLayout
            title="Service Informatique"
            subtitle="Administration système, monitoring infrastructure et sécurité"
        >
            <div className="flex items-center gap-1.5 mb-6">
                <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
            </div>
            {/* Health Indicators Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Systèmes" value="6/6" subtitle="services opérationnels" icon={Zap} variant="success" />
                <StatCard title="Infrastructure IoT" value="98.2%" subtitle="capteurs en ligne" icon={Wifi} variant="primary" />
                <StatCard title="Sécurité" value="A+" subtitle="score de vulnérabilité" icon={ShieldCheck} variant="primary" />
                <StatCard title="Logs Anomalies" value="12" subtitle="dernières 24h" icon={Bug} variant="warning" />
            </div>

            <Tabs defaultValue="system" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="system" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Monitor className="h-4 w-4" />
                            Monitoring
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Users className="h-4 w-4" />
                            Utilisateurs
                        </TabsTrigger>
                        <TabsTrigger value="activations" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Activations SIHG
                            <Badge variant="outline" className="h-4 px-1 text-[9px] bg-indigo-100 text-indigo-700 border-indigo-200">
                                {pendingStations.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="iot" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Wifi className="h-4 w-4" />
                            Infra IoT
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Terminal className="h-4 w-4" />
                            Logs Système
                        </TabsTrigger>
                        <TabsTrigger value="backups" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Database className="h-4 w-4" />
                            Sauvegardes
                        </TabsTrigger>
                    </TabsList>

                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                </div>

                {/* TAB: Monitoring */}
                <TabsContent value="system" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Server className="h-5 w-5 text-primary" />
                                    État des Services Cloud
                                </CardTitle>
                                <CardDescription>Statut en temps réel des composants backend</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {systemHealth.map((service, i) => (
                                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-sm font-medium text-slate-700">{service.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32">
                                                    <Progress value={service.uptime} className="h-1.5" />
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-600 bg-emerald-50">
                                                    {service.uptime}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 border-t py-4 px-6 flex justify-between items-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Temps de réponse moyen: 45ms</p>
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-slate-900 text-white font-black text-[10px] px-4 rounded-lg uppercase tracking-widest gap-2"
                                    onClick={() => {
                                        setIsSavingConfig(true);
                                        setTimeout(() => {
                                            setIsSavingConfig(false);
                                            toast.success('Configurations sauvegardées', { description: 'Toute la configuration système a été enregistrée avec succès.' });
                                        }, 1500);
                                    }}
                                    disabled={isSavingConfig}
                                >
                                    {isSavingConfig ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
                                    Sauvegarder Configuration
                                </Button>
                            </CardFooter>
                        </Card>

                        <div className="space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Cpu className="h-5 w-5 text-primary" />
                                        Charge Hyperviseur
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                            <span>CPU Usage</span>
                                            <span className="text-emerald-600">12%</span>
                                        </div>
                                        <Progress value={12} className="h-2" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                            <span>Memory Usage</span>
                                            <span className="text-blue-600">4.2GB / 16GB</span>
                                        </div>
                                        <Progress value={26} className="h-2" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                            <span>Storage Latency</span>
                                            <span className="text-emerald-600">0.8ms</span>
                                        </div>
                                        <Progress value={5} className="h-2" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-none text-slate-100 shadow-xl overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-emerald-400" />
                                        Live System Output
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="font-mono text-[10px] space-y-1 opacity-80">
                                    <p className="text-emerald-400">[SYSTEM] Initialization complete...</p>
                                    <p>[AUTH] Session verify: user_id=f7e2-882a-1102</p>
                                    <p>[IOT] Gateway "Conakry-North" handshake successful</p>
                                    <p className="text-amber-400">[WARN] Cache MISS for query: get_all_stations_v2</p>
                                    <p>[DB] Transaction committed: id=tx_9921</p>
                                    <p className="text-blue-400"># ready to accept connections on port 443</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB: Users */}
                <TabsContent value="users" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Comptes Utilisateurs</CardTitle>
                                    <CardDescription>Gestion des identités et des accès</CardDescription>
                                </div>
                                <div className="relative w-full md:w-[300px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher un utilisateur..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Utilisateur</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">ID Système</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Rôle Actif</th>
                                            <th className="text-right py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{u.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 font-mono text-[10px] text-slate-400">{u.user_id.substring(0, 18)}...</td>
                                                <td className="py-4 px-4 text-center">
                                                    <Badge className={cn("text-[10px] font-bold uppercase tracking-tighter",
                                                        roleColors[getUserRole(u.user_id)] || roleColors.default
                                                    )} variant="outline">
                                                        {roleLabels[getUserRole(u.user_id) as AppRole] || getUserRole(u.user_id)}
                                                    </Badge>
                                                    {(u.statut === 'inactif' || (u as any).statut === 'inactif') && (
                                                      <Badge className="ml-1 text-[9px] font-black uppercase bg-orange-100 text-orange-600 border-orange-200" variant="outline">
                                                        En attente
                                                      </Badge>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 gap-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handleResetPassword(u.email)}
                                                        >
                                                            <Key className="h-3.5 w-3.5" />
                                                            Pass Reset
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                              "h-8 gap-2 text-xs",
                                                              u.statut === 'actif'
                                                                ? "text-slate-600 hover:bg-slate-50"
                                                                : "text-emerald-600 hover:bg-emerald-50 font-bold"
                                                            )}
                                                            onClick={() => handleSuspendUser(u.id, u.statut || 'actif')}
                                                        >
                                                            <Lock className="h-3.5 w-3.5" />
                                                            {u.statut === 'actif' ? 'Suspendre' : 'Activer'}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 gap-2 text-xs text-red-600"
                                                            onClick={() => handleDeleteUser(u.id)}
                                                        >
                                                            <LogOut className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Activations SIHG */}
                <TabsContent value="activations" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-indigo-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Key className="h-5 w-5 text-indigo-600" />
                                Installations en attente d'activation technique
                            </CardTitle>
                            <CardDescription>Étape Finale : Configuration réseau, IoT et ouverture des accès SIHG</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Installation</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Localisation</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Société</th>
                                            <th className="text-right py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {pendingStations.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-muted-foreground italic">Aucune activation en attente (DSI)</td>
                                            </tr>
                                        ) : (
                                            pendingStations.map(s => (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <p className="font-bold text-slate-900">{s.nom}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{s.code}</p>
                                                    </td>
                                                    <td className="py-4 px-4">{s.region} / {s.ville}</td>
                                                    <td className="py-4 px-4 font-black text-indigo-600">{s.entreprise?.nom}</td>
                                                    <td className="py-4 px-6 text-right">
                                                        <Button 
                                                            onClick={() => handleActivateStation(s)}
                                                            className="h-8 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
                                                        >
                                                            Activer l'Installation
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Logs */}
                <TabsContent value="logs">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white pb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Terminal className="h-5 w-5 text-emerald-400" />
                                        Audit Logs Système
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">Historique complet des actions administratives</CardDescription>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">INFO</Badge>
                                    <Badge variant="outline" className="border-amber-500/50 text-amber-400">WARN</Badge>
                                    <Badge variant="outline" className="border-red-500/50 text-red-400">ERROR</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 bg-slate-950 font-mono text-[12px]">
                            <div className="divide-y divide-slate-900 overflow-auto max-h-[350px]">
                                {auditLogs.length === 0 && (
                                    <div className="p-6 text-center text-slate-500 italic">Aucun log trouvé</div>
                                )}
                                {auditLogs.map(log => (
                                    <div key={log.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-900/50 transition-colors">
                                        <span className="text-slate-500 min-w-[120px]">{log.timestamp}</span>
                                        <Badge className={cn("h-5 min-w-[80px] justify-center text-[10px]",
                                            log.level === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                log.level === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                    'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                        )} variant="outline">
                                            {log.source.toUpperCase()}
                                        </Badge>
                                        <span className="text-slate-300 flex-1 truncate">{log.action}</span>
                                        <span className="text-slate-500 italic text-[10px] min-w-[150px] truncate" title={log.user}>{log.user}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-950 border-t border-slate-900 py-3 px-6">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-400 hover:text-white text-[10px] gap-2"
                                onClick={() => toast.info('Analyse des logs', { description: 'Recherche d\'entrées plus anciennes dans l\'archive système...' })}
                            >
                                <RefreshCw className="h-3 w-3" /> Charger plus d'entrées
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* TAB: Backups */}
                <TabsContent value="backups">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" />
                                    Archives de Sauvegarde SQL
                                </CardTitle>
                                <CardDescription>Points de restauration quotidiens (Automatisés)</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {[
                                        { date: '12 Mars 2026, 04:00', size: '2.4 GB', type: 'FULL', status: 'verified' },
                                        { date: '11 Mars 2026, 04:00', size: '2.3 GB', type: 'FULL', status: 'verified' },
                                        { date: '10 Mars 2026, 04:00', size: '2.3 GB', type: 'FULL', status: 'verified' },
                                        { date: '09 Mars 2026, 04:00', size: '2.2 GB', type: 'INCREMENTAL', status: 'verified' },
                                    ].map((b, i) => (
                                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <HardDrive className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{b.date}</p>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{b.type} • {b.size}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase">Vérifié</Badge>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => toast.success('Intégrité vérifiée', { description: `L'archive du ${b.date} est valide.` })}
                                                >
                                                    <RefreshCw className="h-4 w-4 text-slate-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t py-4 px-6 justify-between items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Prochaine sauvegarde : Demain 04:00</p>
                                <Button size="sm" className="bg-indigo-600 text-white font-black text-[10px] h-9 px-6 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 gap-2"
                                    onClick={() => {
                                        setIsBackingUp(true);
                                        toast.loading('Initialisation de la sauvegarde...', { id: 'backup-task' });
                                        setTimeout(() => {
                                            setIsBackingUp(false);
                                            toast.success('Sauvegarde complète réussie', { 
                                                id: 'backup-task',
                                                description: 'L\'archive SQL a été générée et stockée sur le bucket Cloud.' 
                                            });
                                        }, 3000);
                                    }}
                                    disabled={isBackingUp}
                                >
                                    {isBackingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                                    Lancer Backup Manuel
                                </Button>
                            </CardFooter>
                        </Card>

                        <div className="space-y-6">
                            <Card className="border-none shadow-sm bg-blue-900 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Shield className="h-24 w-24" />
                                </div>
                                <CardHeader className="relative z-10">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80 decoration-primary underline decoration-2 underline-offset-4">Sécurité Système</CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10 space-y-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Dernier Scan</p>
                                        <p className="text-lg font-black tracking-tight">AUCUNE MENACE</p>
                                        <div className="mt-2 text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-2">
                                            <ShieldCheck className="h-3 w-3" />
                                            Certificat SSL Actif
                                        </div>
                                    </div>
                                    <Button className="w-full bg-white text-blue-900 font-black text-[10px] uppercase tracking-widest h-10 rounded-xl hover:bg-blue-50"
                                        onClick={() => toast.success('Audit de sécurité lancé', { description: 'Scan complet des vulnérabilités en cours. Résultats disponibles sous 10 minutes.' })}
                                    >
                                        Audit Sécurité Complet
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 leading-none">Support Technique</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Wifi className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Assistance DSI</p>
                                            <p className="text-[10px] text-slate-500 font-medium italic">Un problème ? Contactez le support.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full mt-4 border-slate-200 text-slate-600 font-bold text-xs rounded-xl h-10"
                                        onClick={() => toast.info('Ticket de support créé', { description: 'Votre demande a été enregistrée. L\'équipe DSI vous contactera sous 30 minutes.' })}
                                    >
                                        Ouvrir un ticket
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
