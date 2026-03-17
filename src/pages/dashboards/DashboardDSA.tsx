import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateExcelReport } from '@/lib/excelExport';
import {
    Activity,
    Fuel,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    Shield,
    Truck,
    Ship,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    BarChart3,
    Package,
    Navigation,
    UserCheck,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    Download,
    ClipboardCheck,
    ShieldCheck,
    ShieldAlert,
    Info,
    FolderOpen
} from 'lucide-react';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { notifyStationStatusUpdate } from '@/lib/notifications';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdreRavitaillementDialog } from '@/components/dashboard/OrdreRavitaillementDialog';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface DSAStats {
    totalQuotasRequested: number;
    pendingValidation: number;
    activeDeliveries: number;
    stockAlerts: number;
}

export default function DashboardDSA() {
    const { role, profile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DSAStats>({
        totalQuotasRequested: 4850000, // Mocked total liters
        pendingValidation: 0,
        activeDeliveries: 12,
        stockAlerts: 0,
    });
    const [stations, setStations] = useState<Station[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrdreDialogOpen, setIsOrdreDialogOpen] = useState(false);

    const isDsaBoss = role === 'directeur_aval' || role === 'directeur_adjoint_aval';
    const isDsaTech = role === 'technicien_support_dsa' || role === 'technicien_flux';
    const isDsaField = role === 'chef_bureau_aval' || role === 'agent_supervision_aval' || role === 'controleur_distribution';
    const isDsaAdjoint = role === 'directeur_adjoint_aval';

    // Mock Quotas for companies - demonstrating what Directeur DSA wants to see
    const companyQuotas = [
        { sigle: 'TOTAL', used: 1250000, total: 1500000, color: 'text-red-600' },
        { sigle: 'SHELL', used: 980000, total: 1200000, color: 'text-amber-600' },
        { sigle: 'KP', used: 450000, total: 800000, color: 'text-emerald-600' },
        { sigle: 'TMI', used: 210000, total: 500000, color: 'text-emerald-600' },
    ];

    const CONSOMMATION_JOURNALIERE = {
        essence: 800000,
        gasoil: 1200000,
    };

    const totalStock = useMemo(() => stations.reduce((acc, s) => ({
        essence: acc.essence + (s.stockActuel.essence || 0),
        gasoil: acc.gasoil + (s.stockActuel.gasoil || 0),
    }), { essence: 0, gasoil: 0 }), [stations]);

    const autonomie = {
        essence: totalStock.essence > 0 ? Math.round(totalStock.essence / CONSOMMATION_JOURNALIERE.essence) : 0,
        gasoil: totalStock.gasoil > 0 ? Math.round(totalStock.gasoil / CONSOMMATION_JOURNALIERE.gasoil) : 0,
    };

    // Détection de pénurie par station (Seuil < 2 jours d'autonomie basés sur capacité)
    const stationsEnAlerte = useMemo(() => {
        return stations.filter(s => {
            const lowEssence = s.stockActuel.essence < (s.capacite.essence * 0.15); // Moins de 15%
            const lowGasoil = s.stockActuel.gasoil < (s.capacite.gasoil * 0.15);
            return lowEssence || lowGasoil;
        });
    }, [stations]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resOrders, resAlerts, resRawStations, resDeliveries, resEntreprisesPending, resStationsPending] = await Promise.all([
                supabase.from('ordres_livraison').select('*, station:stations(nom, entreprise:entreprises(sigle))').in('statut', ['en_attente', 'approuve', 'en_cours']).order('created_at', { ascending: false }).limit(5),
                supabase.from('alertes').select('*, station:stations(nom)').eq('resolu', false),
                supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)'),
                supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('statut', 'en_route'),
                supabase.from('entreprises').select('*', { count: 'exact', head: true }).eq('statut', 'attente_validation'),
                supabase.from('stations').select('*', { count: 'exact', head: true }).eq('statut', 'attente_validation')
            ]);

            const ordersPendingCount = await supabase.from('ordres_livraison').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente');

            setStats(prev => ({
                ...prev,
                pendingValidation: (resEntreprisesPending.count || 0) + (resStationsPending.count || 0),
                stockAlerts: resAlerts.data?.length || 0,
                activeDeliveries: resDeliveries.count || 12,
            }));

            setRecentOrders(resOrders.data || []);
            setAlerts(resAlerts.data || []);

            const mappedStations: Station[] = (resRawStations.data || []).map(s => ({
                id: s.id,
                nom: s.nom,
                code: s.code,
                adresse: s.adresse,
                ville: s.ville,
                region: s.region,
                type: s.type as StationType,
                entrepriseId: s.entreprise_id,
                entrepriseNom: s.entreprises?.nom || 'Inconnu',
                entrepriseSigle: s.entreprises?.sigle || '?',
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
                statut: s.statut as StationStatus,
                gestionnaire: { nom: '', telephone: '', email: '' }
            }));

            setStations(mappedStations);

        } catch (error) {
            console.error('Error fetching DSA data:', error);
        } finally {
            setLoading(false);
        }
    }, []);



    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateReport = async () => {
        try {
            await generateCustomReportPDF({
                type: 'stock-national',
                title: 'RAPPORT LOGISTIQUE ET FLUX NATIONAUX',
                data: {
                    entreprises: companyQuotas.map(cq => ({
                        nom: cq.sigle,
                        sigle: cq.sigle,
                        stockEssence: 0, // Simplified for this view, or aggregate from stations if needed
                        stockGasoil: 0,
                        stations: stations.filter(s => s.entrepriseSigle === cq.sigle).length,
                    }))
                },
                signerRole: role || 'directeur_aval',
                signerName: profile?.full_name || undefined
            });
        } catch (error) {
            console.error('Error generating DSA report:', error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Entreprise', 'Quota Alloué (L)', 'Volume Consommé (L)', 'Volume Restant (L)', 'Consommation (%)', 'Statut'];
            const data = companyQuotas.map(co => {
                const taux = (co.used / co.total);
                let statut = 'Normal';
                if (taux > 0.9) statut = 'CRITIQUE';
                else if (taux > 0.7) statut = 'Avertissement';
                
                return [
                    co.sigle,
                    co.total,
                    co.used,
                    (co.total - co.used),
                    taux, // Will be formatted by the utility
                    statut
                ];
            });

            await generateExcelReport({
                title: 'Rapport National de Contrôle des Quotas Aval',
                filename: `Anomalies_Quotas_SONAP_${format(new Date(), 'dd-MM-yyyy')}`,
                headers,
                data,
                signerRole: role || 'directeur_aval',
                signerName: profile?.full_name || 'Direction des Services Aval'
            });
        } catch (error) {
            console.error('Error exporting Excel:', error);
            alert("Erreur lors de la génération de l'Excel.");
        }
    };

    return (
        <DashboardLayout
            title="Direction des Services Aval (DSA)"
            subtitle="Supervision Logistique, Distribution et Quotas"
        >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-1 bg-blue-600 rounded-full" />
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                            {isDsaBoss ? 'Direction' : isDsaField ? 'Supervision' : isDsaTech ? 'Support Technique' : 'Module'} DSA
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            SIHG National — {profile?.poste || 'Supervision Logistique'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 bg-white/50 border-slate-200">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Mettre à jour
                    </Button>
                    {role !== 'super_admin' && (
                      <Button 
                          size="sm" 
                          className="gap-2 bg-emerald-600 hover:bg-blue-700 shadow-lg shadow-emerald-500/20 font-bold"
                          onClick={handleExportExcel}
                      >
                          <Download className="h-4 w-4" />
                          Export Anomalies Excel
                      </Button>
                    )}
                    {isDsaBoss && (
                        <Button size="sm" variant="secondary" className="gap-2 shadow-lg" asChild>
                            <Link to="/dashboard/dsa/quotas">
                                <Package className="h-4 w-4" />
                                Gérer Quotas
                            </Link>
                        </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-2 shadow-sm" asChild>
                        <Link to="/admin/dossiers">
                            <FolderOpen className="h-4 w-4 text-primary" />
                            Dossiers & Workflow
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 shadow-sm" asChild>
                        <Link to="/rapports">
                            <FileText className="h-4 w-4" />
                            Rapports & Stats
                        </Link>
                    </Button>
                    {(isDsaBoss || role === 'chef_division_distribution' || role === 'admin_etat' || role === 'super_admin') && (
                        <>
                            {role !== 'super_admin' && (
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-emerald-500/20"
                                    onClick={() => navigate('/quotas')}
                                >
                                    Gérer les Quotas Nationaux
                                </Button>
                            )}
                            <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-blue-500/20"
                                onClick={() => setIsOrdreDialogOpen(true)}
                            >
                                <Shield className="h-4 w-4" />
                                Ordonner Ravitaillement
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <TabsTrigger value="overview" className="rounded-xl px-6 py-2 h-10 data-[state=active]:bg-white data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest">
                        Vue d'ensemble
                    </TabsTrigger>
                    <TabsTrigger value="penurie" className="rounded-xl px-6 py-2 h-10 data-[state=active]:bg-white data-[state=active]:text-red-600 font-black uppercase text-[10px] tracking-widest flex gap-2">
                        Vigilance Pénurie
                        {stationsEnAlerte.length > 0 && <Badge variant="destructive" className="h-4 min-w-4 p-0 flex justify-center">{stationsEnAlerte.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="fraude" className="rounded-xl px-6 py-2 h-10 data-[state=active]:bg-white data-[state=active]:text-orange-600 font-black uppercase text-[10px] tracking-widest">
                        Détection Fraude
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    {/* Statistiques Métier DSA (Contenu existant déplacé ici) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Volume Commandé" 
                    value={`${(stats.totalQuotasRequested / 1000000).toFixed(1)}M L`} 
                    subtitle="Derniers 30 jours" 
                    icon={TrendingUp} 
                />
                <StatCard 
                    title="Demandes en Attente" 
                    value={stats.pendingValidation} 
                    subtitle="Validation requise" 
                    icon={Clock} 
                    variant={stats.pendingValidation > 0 ? 'warning' : 'success'}
                />
                <StatCard 
                    title="Livraisons en Cours" 
                    value={stats.activeDeliveries} 
                    subtitle="Camions sur route" 
                    icon={Truck} 
                    variant="primary"
                />
                <StatCard 
                    title="Alertes de Stock" 
                    value={stats.stockAlerts} 
                    subtitle="Urgences prioritaires" 
                    icon={AlertCircle} 
                    variant={stats.stockAlerts > 0 ? 'critical' : 'success'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Section Quotas et Performance Entreprise */}
                <Card className="lg:col-span-2 border-none shadow-xl bg-white dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Package className="h-5 w-5 text-emerald-500" />
                                Suivi des Quotas par Compagnie
                            </CardTitle>
                            <CardDescription>Rapport d'épuisement des autorisations mensuelles</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/entreprises" className="text-xs">Détails <ChevronRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 mt-4">
                            {companyQuotas.map((co) => (
                                <div key={co.sigle} className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("font-black text-sm", co.color)}>{co.sigle}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Consommation Quota</span>
                                        </div>
                                        <div className="flex gap-3 text-xs">
                                            <span className="font-bold text-slate-900 dark:text-white">{co.used.toLocaleString()} L</span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-slate-400 font-medium">{co.total.toLocaleString()} L</span>
                                        </div>
                                    </div>
                                    <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={cn(
                                                "h-full rounded-full transition-all duration-1000",
                                                (co.used / co.total) > 0.9 ? "bg-red-500" : (co.used / co.total) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                                            )} 
                                            style={{ width: `${(co.used / co.total) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold px-1 italic">
                                        <span className="text-slate-400">Progression : {Math.round((co.used / co.total) * 100)}%</span>
                                        <span className={cn(
                                            (co.used / co.total) > 0.9 ? "text-red-600" : "text-emerald-600"
                                        )}>
                                            Reste: {(co.total - co.used).toLocaleString()} L
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                                    <Navigation className="h-5 w-5 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[9px]">Flux Total National (Aval)</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">2.4 Millions L <span className="text-xs font-bold text-emerald-500 ml-1">+12%</span></p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-white border-slate-200" 
                                    onClick={() => navigate('/carte')}
                                >
                                    Voir Carte Flux
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white" 
                                    onClick={() => {
                                      toast.success("Configuration DSA", {
                                        description: "Les paramètres de supervision et seuils d'alerte ont été mis à jour."
                                      });
                                    }}
                                >
                                    Sauvegarder Config
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* File de Validation et Commandes */}
                <div className="space-y-6">
                    <Card className="border-none shadow-lg h-full bg-white dark:bg-slate-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                Créations en Attente
                            </CardTitle>
                            <CardDescription>Validation par l'Admin Central</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stations.filter(s => s.statut === 'attente_validation').length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs italic">Aucune création en attente de validation</div>
                            ) : (
                                stations.filter(s => s.statut === 'attente_validation').slice(0, 3).map(s => (
                                    <div key={s.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-amber-600 text-[8px] uppercase tracking-tighter">Attente Admin</Badge>
                                            <span className="text-[10px] font-bold text-slate-400 italic">Code: {s.code}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900">{s.nom}</h4>
                                            <p className="text-[11px] text-slate-500">{s.entrepriseSigle} / {s.region}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400" asChild>
                                                <Link to={`/stations/${s.id}`}><Info className="h-4 w-4" /></Link>
                                            </Button>
                                            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-white text-[10px]">
                                                En cours de validation
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg h-full bg-white dark:bg-slate-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                Autorisations Aval
                            </CardTitle>
                            <CardDescription>Demandes de ravitaillement à valider</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                        <CheckCircle2 className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Flux fluide : 0 attente</p>
                                </div>
                            ) : (
                                recentOrders.map((order) => (
                                    <div key={order.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-emerald-900 group transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase border-blue-200 text-blue-700 bg-blue-50 dark:bg-emerald-950/30">{order.station?.entreprise?.sigle}</Badge>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase",
                                                    order.statut === 'en_cours' ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                                                )}>{order.statut?.replace('_', ' ')}</Badge>
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{order.station?.nom}</h4>
                                        <div className="mt-3 flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Quantité</span>
                                                <span className="text-xs font-black text-emerald-600">{order.quantite_demandee.toLocaleString()} L</span>
                                            </div>
                                            <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-700" />
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Produit</span>
                                                <span className="text-xs font-black capitalize text-slate-700 dark:text-slate-300">{order.carburant}</span>
                                            </div>
                                        </div>
                                        {order.notes && order.notes.includes('---') && (
                                            <div className="mt-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[9px] font-bold text-blue-800 uppercase">Réponse/Justification reçue</span>
                                            </div>
                                        )}
                                        {(isDsaBoss || role === 'chef_division_distribution') ? (
                                            <Button variant="secondary" size="sm" className="w-full mt-4 h-8 text-[9px] uppercase font-black tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm" asChild>
                                                <Link to="/admin/commandes">Suivi & Détails</Link>
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm" className="w-full mt-4 h-8 text-[9px] uppercase font-black tracking-widest transition-all shadow-sm" asChild>
                                                <Link to="/admin/commandes">{isDsaAdjoint ? 'Détails (Lecture seule)' : 'Voir Suivi'}</Link>
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Stock Alertes prioritaires pour DSA */}
                    <Card className="border-none shadow-lg bg-red-600 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                            <AlertTriangle className="h-16 w-16" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-white text-md font-black italic tracking-tighter uppercase flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Alertes Logistiques
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Stock Frais (Réceptionné)</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-300 text-[8px] border-none italic font-black">Prêt Distribution</Badge>
                                    </div>
                                    <p className="text-xs font-black">Cargaison #IMP-2026-001</p>
                                    <p className="text-[10px] opacity-80 mt-1">Essence sans plomb (15,000 T) disponible au dépôt de Kaloum.</p>
                                    <Button size="sm" className="w-full mt-3 h-7 bg-white/20 hover:bg-white/30 text-[9px] font-black uppercase" onClick={() => navigate('/quotas')}>
                                      Affecter Quotas
                                    </Button>
                                </div>
                                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Alerte Dépôt Conakry</span>
                                        <Badge className="bg-white/20 text-white text-[8px] border-none">Ravitaillement requis</Badge>
                                    </div>
                                    <p className="text-xs font-medium leading-tight">Navire attendu dans 14h pour réapprovisionnement Gasoil.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

                </TabsContent>

                <TabsContent value="penurie" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900">
                                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Stations en Alerte Critique
                                </CardTitle>
                                <CardDescription>Stock {'<'} 15% de la capacité totale</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stationsEnAlerte.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground italic">Aucune station en alerte critique.</div>
                                    ) : stationsEnAlerte.map(s => (
                                        <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase text-slate-400">{s.entrepriseSigle}</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{s.nom}</span>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                {s.stockActuel.essence < s.capacite.essence * 0.15 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-bold text-red-500 uppercase">Essence</span>
                                                        <span className="text-xs font-black text-red-700">{s.stockActuel.essence.toLocaleString()} L</span>
                                                    </div>
                                                )}
                                                {s.stockActuel.gasoil < s.capacite.gasoil * 0.15 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-bold text-red-500 uppercase">Gasoil</span>
                                                        <span className="text-xs font-black text-red-700">{s.stockActuel.gasoil.toLocaleString()} L</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg bg-slate-900 text-white">
                            <CardHeader>
                                <CardTitle className="text-emerald-400 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Analyse Prédictive SONAP
                                </CardTitle>
                                <CardDescription className="text-slate-400">Projection de rupture basée sur la consommation moyenne</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Autonomie Nationale Estimée</h4>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-2xl font-black text-white">{autonomie.essence} Jours</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Essence</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-2xl font-black text-white">{autonomie.gasoil} Jours</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Gasoil</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[11px] text-slate-400 italic">
                                        * Basé sur une consommation journalière nationale de {CONSOMMATION_JOURNALIERE.essence.toLocaleString()}L (E) et {CONSOMMATION_JOURNALIERE.gasoil.toLocaleString()}L (G).
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="fraude" className="space-y-6">
                    <Card className="border-none shadow-lg bg-orange-50 border border-orange-100">
                        <CardHeader>
                            <CardTitle className="text-orange-900 flex items-center gap-2 uppercase text-sm font-black tracking-widest">
                                <Shield className="h-5 w-5" />
                                Monitoring Anti-Fraude National
                            </CardTitle>
                            <CardDescription className="text-orange-700">Système intelligent de détection d'anomalies transactionnelles</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {alerts.length === 0 ? (
                                    <div className="col-span-2 p-8 text-center text-orange-600/50 italic bg-white rounded-2xl border border-orange-100">
                                        Aucune activité suspecte détectée par l'algorithme ce jour.
                                    </div>
                                ) : alerts.map(alert => (
                                    <div key={alert.id} className="p-4 rounded-2xl bg-white border border-orange-200 flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                            <AlertCircle className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-black uppercase text-slate-900">{alert.type}</h5>
                                            <p className="text-[11px] text-slate-600 mt-1">{alert.message}</p>
                                            <p className="text-[9px] font-bold text-orange-600 mt-2 uppercase">Station: {alert.station?.nom}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                             {role !== 'super_admin' && alerts.length > 0 && (
                                 <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase py-6 rounded-2xl shadow-xl shadow-orange-500/20">
                                     Lancer une Enquête Administrative (Audit)
                                 </Button>
                             )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <OrdreRavitaillementDialog open={isOrdreDialogOpen} onOpenChange={setIsOrdreDialogOpen} />
        </DashboardLayout>
    );
}
