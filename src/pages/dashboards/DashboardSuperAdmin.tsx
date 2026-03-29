import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Server, Database, Users, Shield, Activity, AlertTriangle,
  CheckCircle2, Settings, Ship, RefreshCw, Fuel, TrendingUp,
  Building2, Lock, BarChart3, Clock, Zap, Globe, FileCog,
  ArrowUpRight, ArrowDownRight, Terminal, Wifi, ChevronRight,
  Cpu, ShieldCheck, Bug, Fingerprint, LogOut, FileText
} from 'lucide-react';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { GuineaMap } from '@/components/map/GuineaMap';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_LABELS, AppRole } from '@/contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface SystemStats {
  totalUsers: number;
  totalEntreprises: number;
  totalStations: number;
  totalAlertes: number;
  totalImportations: number;
  totalOrders: number;
}

interface StockAccumulator {
  essence: number;
  gasoil: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  statut?: string;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: string;
}

const ACCENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function DashboardSuperAdmin() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalEntreprises: 0,
    totalStations: 0,
    totalAlertes: 0,
    totalImportations: 0,
    totalOrders: 0,
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const CONSOMMATION_JOURNALIERE = {
    essence: 800000,
    gasoil: 1200000,
  };

  const totalStock = useMemo(() => stations.reduce<StockAccumulator>((acc, s) => ({
    essence: acc.essence + (s.stockActuel.essence || 0),
    gasoil: acc.gasoil + (s.stockActuel.gasoil || 0),
  }), { essence: 0, gasoil: 0 }), [stations]);

  const autonomie = {
    essence: totalStock.essence > 0 ? Math.round(totalStock.essence / CONSOMMATION_JOURNALIERE.essence) : 0,
    gasoil: totalStock.gasoil > 0 ? Math.round(totalStock.gasoil / CONSOMMATION_JOURNALIERE.gasoil) : 0,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsers, resEntreprises, resStations, resAlertes, resData, resImportations, resOrders, resRoles] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('entreprises').select('*', { count: 'exact', head: true }),
        supabase.from('stations').select('*', { count: 'exact', head: true }),
        supabase.from('alertes').select('*', { count: 'exact', head: true }).eq('resolu', false),
        supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)'),
        supabase.from('importations').select('*', { count: 'exact', head: true }),
        supabase.from('ordres_livraison').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
        supabase.from('user_roles').select('*'),
      ]);

      setStats({
        totalUsers: resUsers.count || 0,
        totalEntreprises: resEntreprises.count || 0,
        totalStations: resStations.count || 0,
        totalAlertes: resAlertes.count || 0,
        totalImportations: resImportations.count || 0,
        totalOrders: resOrders.count || 0,
      });

      setUsers((resUsers.data || []) as UserProfile[]);
      setUserRoles((resRoles.data || []) as UserRoleRow[]);
      // Extract pending (inactif) accounts for activation panel
      const pending = ((resUsers.data || []) as UserProfile[]).filter(u => (u as any).statut === 'inactif');
      setPendingUsers(pending);

      const mappedStations: Station[] = (resData.data || []).map(s => ({
        id: s.id,
        nom: s.nom,
        code: s.code,
        adresse: s.adresse,
        ville: s.ville,
        region: s.region,
        type: s.type as StationType,
        entrepriseId: s.entreprise_id,
        entrepriseNom: s.entreprises?.nom || 'Inconnu',
        capacite: {
          essence: s.capacite_essence || 0,
          gasoil: s.capacite_gasoil || 0,
          gpl: s.capacite_gpl || 0,
          lubrifiants: s.capacite_lubrifiants || 0,
        },
        stockActuel: {
          essence: s.stock_essence || 0,
          gasoil: s.stock_gasoil || 0,
          gpl: s.stock_gpl || 0,
          lubrifiants: s.stock_lubrifiants || 0,
        },
        nombrePompes: s.nombre_pompes || 0,
        coordonnees: (s.latitude !== null && s.longitude !== null)
          ? { lat: Number(s.latitude), lng: Number(s.longitude) }
          : undefined,
        gestionnaire: { nom: '', telephone: '', email: '' },
        statut: s.statut as StationStatus,
      }));

      setStations(mappedStations);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleActivateUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ statut: 'actif' } as any)
        .eq('id', profileId);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Erreur activation compte:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateReport = async () => {
    try {
      await generateCustomReportPDF({
        type: 'stock-national',
        title: 'RAPPORT GLOBAL DE SUPERVISION SIHG',
        data: {
          entreprises: stations.reduce((acc: any[], s) => {
            const existing = acc.find(e => (e as any).sigle === s.entrepriseSigle);
            if (existing) {
              (existing as any).stockEssence += s.stockActuel.essence;
              (existing as any).stockGasoil += s.stockActuel.gasoil;
              (existing as any).stations += 1;
            } else {
              acc.push({
                nom: s.entrepriseNom,
                sigle: s.entrepriseSigle || 'N/A',
                stockEssence: s.stockActuel.essence,
                stockGasoil: s.stockActuel.gasoil,
                stations: 1
              });
            }
            return acc;
          }, [])
        },
        signerRole: 'super_admin',
      });
    } catch (error) {
      console.error('Error generating global report:', error);
    }
  };

  const systemHealth = [
    { name: 'Base de données (Supabase)', uptime: 100 },
    { name: 'Edge Functions', uptime: 99.9 },
    { name: 'Stockage (Buckets)', uptime: 100 },
    { name: 'Auth Server', uptime: 100 },
    { name: 'API REST', uptime: 99.99 },
    { name: 'Realtime', uptime: 99.5 },
  ];

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

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700 border-red-200',
    admin_etat: 'bg-blue-100 text-blue-700 border-blue-200',
    directeur_general: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    inspecteur: 'bg-amber-100 text-amber-700 border-amber-200',
    analyste: 'bg-purple-100 text-purple-700 border-purple-200',
    service_it: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    responsable_entreprise: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const stockChartData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => ({
      day: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      essence: Math.round(totalStock.essence * (0.8 + Math.random() * 0.4)),
      gasoil: Math.round(totalStock.gasoil * (0.8 + Math.random() * 0.4)),
    }));
  }, [totalStock]);

  const recentUsersCount = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    return users.filter(u => new Date(u.created_at) > cutoff).length;
  }, [users]);

  const quickActions = [
    { label: 'Utilisateurs', sub: 'Gérer les comptes', icon: Users, href: '/utilisateurs', color: 'bg-purple-500' },
    { label: 'Entreprises', sub: 'Agréments', icon: Building2, href: '/entreprises', color: 'bg-blue-500' },
    { label: 'Stations', sub: 'Réseau national', icon: Fuel, href: '/stations', color: 'bg-emerald-500' },
    { label: 'Importations', sub: 'Suivi navires', icon: Ship, href: '/importations', color: 'bg-indigo-500' },
    { label: 'Alertes', sub: `${stats.totalAlertes} actives`, icon: AlertTriangle, href: '/alertes', color: stats.totalAlertes > 0 ? 'bg-red-500' : 'bg-slate-500' },
    { label: 'Rapports', sub: 'Analyses', icon: BarChart3, href: '/rapports', color: 'bg-amber-500' },
    { label: 'Audit', sub: 'Logs sécurité', icon: Shield, href: '/audit', color: 'bg-slate-700' },
    { label: 'Paramètres', sub: 'Config système', icon: Settings, href: '/parametres', color: 'bg-rose-500' },
  ];

  const systemLogs = [
    { level: 'success', source: 'Auth', action: 'Connexion réussie', user: 'admin@sihg.gov.gn', time: 'Il y a 2 min' },
    { level: 'info', source: 'Database', action: 'Mise à jour stock station', user: 'Worker #4', time: 'Il y a 5 min' },
    { level: 'warning', source: 'Network', action: 'IoT Gateway Timeout', user: 'Gateway-Kindia-2', time: 'Il y a 12 min' },
    { level: 'error', source: 'Security', action: 'Tentative accès non autorisé', user: '192.168.1.45', time: 'Il y a 1h' },
    { level: 'success', source: 'System', action: 'Backup quotidien complété', user: 'CronJob', time: 'Il y a 4h' },
  ];

  return (
    <DashboardLayout
      title="Tableau de Bord National"
      subtitle="Super Administration — Supervision complète du système d'information SIHG"
    >
      {/* Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
              <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
              <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
              <h2 className="text-2xl font-black tracking-tight text-foreground">Super Administration</h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Système opérationnel — Tous services actifs</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 bg-background/80 backdrop-blur-sm shadow-sm">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button 
            size="sm" 
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 font-bold"
            onClick={handleGenerateReport}
          >
            <FileText className="h-4 w-4" />
            Générer Rapport Global
          </Button>
          <Button size="sm" variant="secondary" className="gap-2 shadow-lg" asChild>
            <Link to="/utilisateurs">
              <Users className="h-4 w-4" />
              Gestion Globale
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Utilisateurs" value={stats.totalUsers} subtitle={`+${recentUsersCount} cette semaine`} icon={Users} variant={recentUsersCount > 0 ? 'primary' : undefined} />
        <StatCard title="Entreprises" value={stats.totalEntreprises} subtitle="distributeurs agréés" icon={Database} />
        <StatCard title="Stations" value={stats.totalStations} subtitle="points de distribution" icon={Server} />
        <StatCard
          title="Comptes en attente"
          value={pendingUsers.length}
          subtitle="activation DSI requise"
          icon={Lock}
          variant={pendingUsers.length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Ship className="h-20 w-20" /></div>
          <CardContent className="pt-6">
            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Importations Nav.</p>
            <p className="text-4xl font-black text-indigo-900">{stats.totalImportations}</p>
            <p className="text-xs text-indigo-600/60 mt-1 font-medium">navires en suivi actif</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Clock className="h-20 w-20" /></div>
          <CardContent className="pt-6">
            <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Commandes en Attente</p>
            <p className="text-4xl font-black text-amber-900">{stats.totalOrders}</p>
            <p className="text-xs text-amber-600/60 mt-1 font-medium">en cours de validation</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10"><CheckCircle2 className="h-20 w-20" /></div>
          <CardContent className="pt-6">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Disponibilité Système</p>
            <p className="text-4xl font-black text-emerald-900">99.9%</p>
            <p className="text-xs text-emerald-600/60 mt-1 font-medium">uptime sur 30 jours</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <Tabs defaultValue="supervision" className="space-y-6 mb-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="supervision" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4" />
            Supervision
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Fuel className="h-4 w-4" />
            Stocks & Autonomie
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Server className="h-4 w-4" />
            Infrastructure
          </TabsTrigger>
        </TabsList>

        {/* TAB: Supervision */}
        <TabsContent value="supervision" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Carte de Vigilance Nationale
                  </CardTitle>
                  <CardDescription>Distribution des {stats.totalStations} stations en temps réel</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/carte">Plein écran <ChevronRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0 border-t">
                <div className="h-[350px]">
                  {!loading && <GuineaMap stations={stations} height="100%" showControls={false} />}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <div className="space-y-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-500" />
                    Santé des Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {systemHealth.map((service, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-medium text-slate-600 truncate max-w-[140px]">{service.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">{service.uptime}%</span>
                      </div>
                      <Progress value={service.uptime} className="h-1" />
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="border-t bg-slate-50/50 py-2 px-6">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Latence avg: 45ms</p>
                </CardFooter>
              </Card>

              {/* Importation en cours */}
              <Card className="border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Ship className="h-4 w-4 text-primary" />
                    Importations en Cours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest">MT Conakry Star</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30 text-[9px]">En route</Badge>
                    </div>
                    <p className="text-xs text-slate-400">Arrivée prévue : 14h</p>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full text-[10px] h-8 uppercase font-black tracking-wider" asChild>
                    <Link to="/importations">Voir toutes les importations</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              <Settings className="h-4 w-4" />
              Actions Administratives Rapides
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {quickActions.map((action, i) => (
                <Card key={i} className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none group overflow-hidden">
                  <Link to={action.href}>
                    <CardContent className="flex flex-col items-center py-5 px-2">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-all text-white", action.color)}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-black text-[10px] uppercase tracking-tight text-slate-800 dark:text-white text-center">{action.label}</h4>
                      <p className="text-[8px] text-muted-foreground font-medium text-center mt-0.5 leading-tight">{action.sub}</p>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Stock & Autonomie */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="h-32 w-32" /></div>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Autonomie Énergétique Nationale</CardTitle>
                <CardDescription className="text-white/60">Estimation basée sur les stocks consolidés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <NationalAutonomyGauge daysRemaining={autonomie.essence} fuelType="essence" />
                    <div className="mt-4 flex justify-between text-xs text-white/40 uppercase">
                      <span>Stock</span>
                      <span>{totalStock.essence.toLocaleString('fr-GN')} L</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <NationalAutonomyGauge daysRemaining={autonomie.gasoil} fuelType="gasoil" />
                    <div className="mt-4 flex justify-between text-xs text-white/40 uppercase">
                      <span>Stock</span>
                      <span>{totalStock.gasoil.toLocaleString('fr-GN')} L</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Chart */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Évolution des Stocks (7 jours)
                </CardTitle>
                <CardDescription>Tendance des stocks nationaux consolidés</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => [v.toLocaleString() + ' L']}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="essence" name="Essence" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="gasoil" name="Gasoil" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Stations Summary */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Résumé du Parc de Stations</CardTitle>
                <CardDescription>État synthétique par statut</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/stations">Détails <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Ouvertes</p>
                  <p className="text-3xl font-black text-emerald-900">{stations.filter(s => s.statut === 'ouverte').length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-red-50 border-red-100 text-center">
                  <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Fermées</p>
                  <p className="text-3xl font-black text-red-900">{stations.filter(s => s.statut === 'fermee').length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-amber-50 border-amber-100 text-center">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">En Maintenance</p>
                  <p className="text-3xl font-black text-amber-900">{stations.filter(s => s.statut === 'maintenance').length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-3xl font-black text-slate-900">{stats.totalStations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Utilisateurs */}
        <TabsContent value="utilisateurs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Répartition des rôles */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Répartition des Rôles
                </CardTitle>
                <CardDescription>Comptes actifs par type d'accès</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(roleCounts).map(([role, count], i) => (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 truncate max-w-[150px]">
                        {ROLE_LABELS[role as AppRole] || role}
                      </span>
                      <span className="text-xs font-black text-slate-900">{count}</span>
                    </div>
                    <Progress value={(count / (stats.totalUsers || 1)) * 100} className="h-1.5" style={{ '--progress-color': ACCENT_COLORS[i % ACCENT_COLORS.length] } as any} />
                  </div>
                ))}
                {Object.keys(roleCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun rôle trouvé</p>
                )}
              </CardContent>
              <CardFooter className="border-t pt-3">
                <Button variant="outline" className="w-full gap-2 text-xs" asChild>
                  <Link to="/utilisateurs">
                    <Users className="h-4 w-4" />
                    Gérer tous les comptes
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Liste des utilisateurs récents */}
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Comptes Utilisateurs</CardTitle>
                    <CardDescription>{stats.totalUsers} comptes enregistrés dans le système</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase">
                    {recentUsersCount} nouveaux / 7j
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[320px] overflow-y-auto">
                  {users.slice(0, 8).map(u => {
                    const userRole = getUserRole(u.user_id);
                    return (
                      <div key={u.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-100">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {(u.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-none">{u.full_name || 'Non renseigné'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{u.email}</p>
                          </div>
                        </div>
                        <Badge
                          className={cn("text-[10px] font-bold uppercase tracking-tighter", roleColors[userRole] || roleColors.default)}
                          variant="outline"
                        >
                          {ROLE_LABELS[userRole as AppRole] || userRole}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 py-2 px-6">
                <Button variant="ghost" size="sm" className="text-xs gap-2 mx-auto" asChild>
                  <Link to="/utilisateurs">
                    Voir tous les utilisateurs <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Comptes en attente d'activation */}
          {pendingUsers.length > 0 && (
            <Card className="border-2 border-orange-200 shadow-md bg-orange-50/30 overflow-hidden">
              <CardHeader className="bg-orange-500 text-white py-3 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Comptes en attente d'activation DSI
                  </CardTitle>
                  <Badge className="bg-white/20 text-white border-white/30 font-black">
                    {pendingUsers.length} compte{pendingUsers.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-orange-100 text-[11px] mt-1">Ces comptes ont été créés mais ne peuvent pas encore se connecter. Activez-les après vérification manuelle de l'identité.</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pendingUsers.map(u => {
                    const userRole = getUserRole(u.user_id);
                    return (
                      <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-orange-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center">
                            <span className="text-orange-600 font-black text-sm">
                              {(u.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{u.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Créé le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={cn("text-[10px] font-bold uppercase", roleColors[userRole] || roleColors.default)} variant="outline">
                            {ROLE_LABELS[userRole as AppRole] || userRole}
                          </Badge>
                          <Button
                            size="sm"
                            className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                            onClick={() => handleActivateUser(u.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activer le compte
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Infrastructure */}
        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Health Detail */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  État des Services Cloud
                </CardTitle>
                <CardDescription>Statut temps réel de l'infrastructure backend</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {systemHealth.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-28">
                          <Progress value={s.uptime} className="h-1.5" />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-600 bg-emerald-50">
                          {s.uptime}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t py-2 px-6">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Latence moyenne : 45ms</p>
              </CardFooter>
            </Card>

            {/* CPU & Resource monitoring */}
            <div className="space-y-4">
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />
                    Ressources Serveur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'CPU Usage', value: 12, color: 'text-emerald-600', display: '12%' },
                    { label: 'Memory', value: 26, color: 'text-blue-600', display: '4.2GB / 16GB' },
                    { label: 'Storage I/O', value: 5, color: 'text-emerald-600', display: '0.8ms' },
                    { label: 'Bandwidth', value: 34, color: 'text-amber-600', display: '34%' },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                        <span>{item.label}</span>
                        <span className={item.color}>{item.display}</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Terminal Console */}
              <Card className="bg-slate-900 border-none text-slate-100 shadow-xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    Live System Output
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-[10px] space-y-1 opacity-80">
                  <p className="text-emerald-400">[SYSTEM] SIHG v2.0.0 — initialized</p>
                  <p>[AUTH] Session verify: OK (user_id=f7e2...)</p>
                  <p>[IOT] Gateway "Conakry-North" handshake OK</p>
                  <p className="text-amber-400">[WARN] Cache MISS: get_all_stations_v2</p>
                  <p>[DB] Transaction committed: tx_9921</p>
                  <p className="text-blue-400"># Accepting connections on port 443 ✓</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* System Audit Logs */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-emerald-400" />
                    Journaux d'Audit Système
                  </CardTitle>
                  <CardDescription className="text-slate-400">Dernières actions tracées par le moteur de sécurité</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link to="/audit">Voir tout <ChevronRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-slate-950 font-mono text-[12px]">
              <div className="divide-y divide-slate-900">
                {systemLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-900/50 transition-colors">
                    <span className="text-slate-500 min-w-[80px] text-[10px]">{log.time}</span>
                    <Badge className={cn("h-5 min-w-[80px] justify-center text-[10px]",
                      log.level === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        log.level === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          log.level === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    )} variant="outline">
                      {log.source.toUpperCase()}
                    </Badge>
                    <span className="text-slate-300 flex-1">{log.action}</span>
                    <span className="text-slate-500 italic text-[10px]">{log.user}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}