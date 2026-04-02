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
    FolderOpen,
    Plus
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
import { CreateEntrepriseDialog } from '../../components/dashboard/CreateEntrepriseDialog';
import { CreateStationDialog } from '../../components/dashboard/CreateStationDialog';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface DSAStats {
    totalVolumeOrdered: number;
    pendingValidation: number;
    activeDeliveries: number;
    stockAlerts: number;
}

export default function DashboardDSA() {
    const { role, profile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DSAStats>({
        totalVolumeOrdered: 0,
        pendingValidation: 0,
        activeDeliveries: 0,
        stockAlerts: 0,
    });
    const [stations, setStations] = useState<Station[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [pendingDossiers, setPendingDossiers] = useState<any[]>([]);
    const [activeDeliveriesTracker, setActiveDeliveriesTracker] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrdreDialogOpen, setIsOrdreDialogOpen] = useState(false);
    const [isCreateEntrepriseOpen, setIsCreateEntrepriseOpen] = useState(false);
    const [isCreateStationOpen, setIsCreateStationOpen] = useState(false);

    const isDsaBoss = role === 'directeur_aval' || role === 'directeur_adjoint_aval';
    const isDsaTech = role === 'technicien_aval' || role === 'technicien_support_dsa' || role === 'technicien_flux';
    const isDsaField = role === 'chef_service_aval' || role === 'agent_technique_aval' || role === 'superviseur_aval' || role === 'controleur_distribution';

    // Rôles stratégiques en lecture seule sur ce dashboard
    const GUEST_ROLES: string[] = ['directeur_general', 'directeur_adjoint', 'secretariat_direction', 'service_it', 'super_admin', 'inspecteur', 'analyste_regulation', 'analyste'];
    const isGuest = role ? GUEST_ROLES.includes(role) : false;

    // Dynamically calculate company inventory distribution
    const companyStats = useMemo(() => {
        const statsMap: Record<string, { sigle: string, used: number, total: number }> = {};
        
        stations.forEach(s => {
            const sigle = s.entrepriseSigle || 'AUTRE';
            if (!statsMap[sigle]) {
                statsMap[sigle] = { sigle, used: 0, total: 0 };
            }
            statsMap[sigle].used += (s.stockActuel.essence || 0) + (s.stockActuel.gasoil || 0);
            statsMap[sigle].total += (s.capacite.essence || 0) + (s.capacite.gasoil || 0);
        });

        return Object.values(statsMap).map(stat => ({
            ...stat,
            color: (stat.used / stat.total) > 0.8 ? 'text-red-600' : 
                   (stat.used / stat.total) < 0.2 ? 'text-amber-600' : 'text-emerald-600'
        })).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [stations]);

    const CONSOMMATION_JOURNALIERE = {
        essence: 850000,
        gasoil: 1250000,
    };

    const totalStock = useMemo(() => stations.reduce((acc, s) => ({
        essence: acc.essence + (s.stockActuel.essence || 0),
        gasoil: acc.gasoil + (s.stockActuel.gasoil || 0),
    }), { essence: 0, gasoil: 0 }), [stations]);

    const autonomie = {
        essence: totalStock.essence > 0 ? Math.round(totalStock.essence / CONSOMMATION_JOURNALIERE.essence) : 0,
        gasoil: totalStock.gasoil > 0 ? Math.round(totalStock.gasoil / CONSOMMATION_JOURNALIERE.gasoil) : 0,
    };

    const stationsEnAlerte = useMemo(() => {
        return stations.filter(s => {
            const lowEssence = s.stockActuel.essence < (s.capacite.essence * 0.15);
            const lowGasoil = s.stockActuel.gasoil < (s.capacite.gasoil * 0.15);
            return lowEssence || lowGasoil;
        });
    }, [stations]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

            const [resOrders, resRawStations, resTotalOrders] = await Promise.all([
                supabase.from('ordres_livraison').select('*, station:stations(nom, entreprise:entreprises(sigle))').in('statut', ['en_attente', 'approuve', 'en_cours']).order('created_at', { ascending: false }).limit(5),
                supabase.from('stations').select('*, entreprises(nom, sigle)'),
                supabase.from('ordres_livraison').select('quantite_demandee').gte('created_at', startOfMonth)
            ]);

            const resAlerts = await (supabase as any).from('alertes').select('*, station:stations(nom)').eq('resolu', false).limit(10);
            const { data: resDeliveriesList } = await (supabase as any).from('livraisons').select('*, station:stations(nom)').eq('statut', 'en_cours');
            const resDeliveries = { count: resDeliveriesList?.length || 0, data: resDeliveriesList };
            const resDossiers = await (supabase as any).from('dossiers_entreprise').select('*, entreprises(nom, sigle)').in('statut', ['numerise', 'en_analyse_tech']).order('created_at', { ascending: false }).limit(5);

            const ordersPendingCount = await supabase.from('ordres_livraison').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente');
            
            const totalVol = resTotalOrders.data?.reduce((acc, curr: any) => acc + (curr.quantite_demandee || 0), 0) || 0;

            setStats({
                totalVolumeOrdered: totalVol,
                pendingValidation: ordersPendingCount.count || 0,
                activeDeliveries: resDeliveries.count || 0,
                stockAlerts: resAlerts.data?.length || 0,
            });

            setRecentOrders(resOrders.data || []);
            setActiveDeliveriesTracker(resDeliveriesList || []);
            setAlerts(resAlerts.data || []);
            setPendingDossiers(resDossiers.data || []);

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
            toast.error("Erreur de chargement des données DSA");
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
                title: 'RAPPORT DE SITUATION ÉNERGÉTIQUE NATIONALE',
                data: {
                    stats_globales: {
                        total_volume: stats.totalVolumeOrdered,
                        alertes: stats.stockAlerts,
                        couverture: Math.min(autonomie.essence, autonomie.gasoil)
                    },
                    stocks: [
                        { produit: 'Essence Super', quantite: totalStock.essence, autonomie: autonomie.essence },
                        { produit: 'Gasoil', quantite: totalStock.gasoil, autonomie: autonomie.gasoil }
                    ]
                },
                signerRole: role || 'directeur_aval',
                signerName: profile?.full_name || 'Direction DSA'
            });
        } catch (error) {
            console.error('Report Generation Error:', error);
            toast.error("Erreur lors de la génération du rapport");
        }
    };

    const handleDossierAction = async (dossierId: string, action: 'analyse' | 'valider' | 'rejeter') => {
        let nextStatut: string = '';
        if (action === 'analyse') nextStatut = 'en_analyse_tech';
        else if (action === 'valider') nextStatut = 'valide_tech';
        else if (action === 'rejeter') nextStatut = 'rejete_tech';

        try {
            const { error } = await (supabase as any)
                .from('dossiers_entreprise')
                .update({ statut: nextStatut })
                .eq('id', dossierId);

            if (error) throw error;

            toast.success(`Dossier mis à jour : ${nextStatut.replace(/_/g, ' ')}`);
            fetchData();
        } catch (error: any) {
            toast.error("Erreur lors de la mise à jour du dossier");
        }
    };

    return (
        <DashboardLayout
            title="Direction des Services Aval (DSA)"
            subtitle="Gestion de la distribution, régulation des stocks et des flux nationaux"
        >
            <div className="flex items-center gap-1.5 mb-6">
                <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard 
                    title="Volume Commandé (Mois)" 
                    value={`${(stats.totalVolumeOrdered / 1000000).toFixed(2)}M`} 
                    icon={Fuel} 
                    trend={{ value: 12, positive: true }} 
                />
                <StatCard 
                    title="En Attente Validation" 
                    value={stats.pendingValidation} 
                    icon={ClipboardCheck} 
                    variant={stats.pendingValidation > 5 ? 'warning' : 'default'}
                />
                <StatCard 
                    title="Livraisons en Cours" 
                    value={stats.activeDeliveries} 
                    icon={Truck} 
                    variant="primary"
                />
                <StatCard 
                    title="Alertes de Stock" 
                    value={stats.stockAlerts} 
                    icon={AlertTriangle} 
                    variant={stats.stockAlerts > 0 ? 'critical' : 'default'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                État des Stocks Nationaux
                            </CardTitle>
                            <CardDescription>Autonomie énergétique par type de carburant</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleGenerateReport} className="h-8 gap-2 font-bold border-slate-200">
                                <Download className="h-3.5 w-3.5 text-primary" />
                                Rapport PDF
                            </Button>
                            {!isGuest && isDsaBoss && (
                                <>
                                    <Button size="sm" onClick={() => setIsCreateEntrepriseOpen(true)} className="h-8 gap-2 bg-blue-600 text-white font-bold">
                                        <Plus className="h-3.5 w-3.5" />
                                        Entreprise
                                    </Button>
                                    <Button size="sm" onClick={() => setIsCreateStationOpen(true)} className="h-8 gap-2 bg-emerald-600 text-white font-bold">
                                        <Plus className="h-3.5 w-3.5" />
                                        Station
                                    </Button>
                                    <Button size="sm" onClick={() => setIsOrdreDialogOpen(true)} className="h-8 gap-2 bg-slate-900 text-white font-bold">
                                        <Plus className="h-3.5 w-3.5" />
                                        Ravitaillement
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="p-6 rounded-2xl bg-[#00944D]/5 border border-[#00944D]/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-[#00944D] flex items-center justify-center shadow-lg shadow-[#00944D]/20">
                                                <Fuel className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-[#00944D] uppercase tracking-widest">Essence Super</p>
                                                <p className="text-2xl font-black text-slate-900">{(totalStock.essence / 1000).toLocaleString()} m³</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-[#00944D] text-white border-none font-black">{autonomie.essence} Jours</Badge>
                                    </div>
                                    <Progress value={Math.min(100, (autonomie.essence / 30) * 100)} className="h-3 bg-slate-200" />
                                    <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase italic">* Basé sur une consommation de {CONSOMMATION_JOURNALIERE.essence.toLocaleString()}L/jour</p>
                                </div>

                                <div className="p-6 rounded-2xl bg-[#FCD116]/5 border border-[#FCD116]/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-[#FCD116] flex items-center justify-center shadow-lg shadow-[#FCD116]/20">
                                                <Activity className="h-5 w-5 text-slate-900" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-[#FCD116] uppercase tracking-widest">Gasoil (AGO)</p>
                                                <p className="text-2xl font-black text-slate-900">{(totalStock.gasoil / 1000).toLocaleString()} m³</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-slate-900 text-[#FCD116] border-none font-black">{autonomie.gasoil} Jours</Badge>
                                    </div>
                                    <Progress value={Math.min(100, (autonomie.gasoil / 30) * 100)} className="h-3 bg-slate-200" />
                                    <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase italic">* Basé sur une consommation de {CONSOMMATION_JOURNALIERE.gasoil.toLocaleString()}L/jour</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-8">
                                <NationalAutonomyGauge 
                                    daysRemaining={Math.min(autonomie.essence, autonomie.gasoil)} 
                                    label="Sécurité Nationale" 
                                />
                                <div className="mt-6 text-center">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black border-slate-200 py-1">Seuil de Sécurité : 15 Jours</Badge>
                                    <p className="text-[11px] text-slate-400 mt-2 italic font-medium px-4">Indice combiné de réserve stratégique nationale</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Répartition Inventaire
                        </CardTitle>
                        <CardDescription className="text-white/50">Top 5 acteurs du marché</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {companyStats.map((company, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-black border border-slate-200 shadow-sm">
                                            {company.sigle[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 leading-tight">{company.sigle}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{(company.used / 1000).toLocaleString()} m³</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-black text-sm", company.color)}>{Math.round((company.used / company.total) * 100)}%</p>
                                        <p className="text-[10px] text-slate-400 font-medium">de capacité</p>
                                    </div>
                                </div>
                            ))}
                            {companyStats.length === 0 && (
                                <div className="p-12 text-center text-slate-400 italic">
                                    Aucune donnée disponible
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Truck className="h-5 w-5 text-indigo-600" />
                                Ravitaillements Récents
                            </CardTitle>
                            <CardDescription>Suivi des ordres de livraison (SGP)</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/logistique')} className="text-primary font-bold text-xs uppercase tracking-widest">Voir tout</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                        <th className="text-left font-black p-4 text-[10px] uppercase tracking-widest">Station / Acteur</th>
                                        <th className="text-left font-black p-4 text-[10px] uppercase tracking-widest">Produit</th>
                                        <th className="text-left font-black p-4 text-[10px] uppercase tracking-widest">Quantité</th>
                                        <th className="text-right font-black p-4 text-[10px] uppercase tracking-widest">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentOrders.map((order, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 uppercase font-black text-slate-900 group">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[150px]">{order.station?.nom || 'Inconnu'}</span>
                                                    <span className="text-[9px] text-primary">{order.station?.entreprise?.sigle || 'SGP'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 p-4 capitalize font-bold text-slate-600">{order.carburant}</td>
                                            <td className="p-4 font-black text-slate-900">{(order.quantite_demandee || 0).toLocaleString()} <span className="text-[9px] text-slate-400">L</span></td>
                                            <td className="p-4 text-right">
                                                <Badge className={cn(
                                                    "text-[9px] font-black uppercase tracking-tighter border-none",
                                                    order.statut === 'en_attente' ? "bg-amber-100 text-amber-600" :
                                                    order.statut === 'approuve' ? "bg-emerald-100 text-emerald-600" :
                                                    "bg-blue-100 text-blue-600"
                                                )}>
                                                    {order.statut}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentOrders.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Aucun ordre de ravitaillement</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-blue-50 border-t-4 border-t-blue-500 overflow-hidden lg:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
                            <Activity className="h-4 w-4" />
                            Camions en Approche
                        </CardTitle>
                        <CardDescription className="text-blue-600/60 text-xs">Suivi Logistique TR</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {activeDeliveriesTracker && activeDeliveriesTracker.length > 0 ? (
                            activeDeliveriesTracker.map((trk: any) => (
                                <div key={trk.id} className="p-3 bg-white rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-blue-500"></div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{trk.station?.nom || 'Station X'}</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="font-bold text-slate-800 leading-tight">{trk.produit}</p>
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 mt-1 text-[9px] font-mono border-slate-200">Camion: {trk.camion_plaque}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-blue-600">{(trk.quantite_prevue || 0).toLocaleString()} L</p>
                                            <p className="text-[9px] text-blue-400 font-bold uppercase">En Route 🚚</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                                <Truck className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs italic">Aucune livraison en cours</p>
                            </div>
                        )}
                    </CardContent>
                </Card>


                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FolderOpen className="h-5 w-5 text-indigo-600" />
                                Dossiers Techniques (DSA)
                            </CardTitle>
                            <CardDescription>Demandes en cours d'analyse technique</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/dossiers')} className="text-primary font-bold text-xs">Registre</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {pendingDossiers.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic">Aucun dossier à traiter</div>
                            ) : (
                                pendingDossiers.map((d, i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 leading-none">{(d as any).entite_nom || d.entreprises?.nom || 'Dossier Technique'}</h4>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">{d.numero_dossier}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter border-none",
                                                d.statut === 'numerise' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                                            )}>
                                                {d.statut === 'numerise' ? 'Nouveau' : 'En Analyse'}
                                            </Badge>
                                            
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {d.statut === 'numerise' && !isGuest && (
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Prendre en charge" onClick={() => handleDossierAction(d.id, 'analyse')}>
                                                        <Clock className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {d.statut === 'en_analyse_tech' && !isGuest && isDsaBoss && (
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Valider techniquement" onClick={() => handleDossierAction(d.id, 'valider')}>
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {!isGuest && isDsaBoss && (
                                                     <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Rejeter" onClick={() => handleDossierAction(d.id, 'rejeter')}>
                                                        <ShieldAlert className="h-3.5 w-3.5" />
                                                     </Button>
                                                )}
                                            </div>

                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" asChild>
                                                <Link to={`/dossiers/${d.id}`}><ChevronRight className="h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-l-red-600">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                Alertes de Continuité
                            </CardTitle>
                            <CardDescription>Risques de rupture ou anomalies détectées</CardDescription>
                        </div>
                        <Badge variant="destructive" className="font-black h-5 text-[10px] tracking-widest animate-pulse">SIHG MONITOR</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {alerts.map((alert, i) => (
                            <div key={i} className="group p-4 rounded-2xl border border-slate-100 bg-white hover:border-red-200 hover:shadow-md transition-all flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    alert.niveau === 'critique' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                )}>
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{alert.station?.nom || 'Alerte Système'}</p>
                                        <p className="text-[9px] font-bold text-slate-400">{format(new Date(alert.created_at), 'HH:mm', { locale: fr })}</p>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{alert.message}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        {!isGuest && (role === 'directeur_aval' || role === 'super_admin') && (
                                            <Button variant="outline" size="sm" className="h-6 text-[9px] font-black uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50">Transmettre Police Générale</Button>
                                        )}
                                        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-widest">Ignorer</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {alerts.length === 0 && (
                            <div className="p-12 text-center text-slate-400 italic flex flex-col items-center gap-4">
                                <ShieldCheck className="h-12 w-12 text-emerald-100" />
                                <p>Toutes les stations sont dans les seuils nominaux</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <OrdreRavitaillementDialog 
                open={isOrdreDialogOpen} 
                onOpenChange={setIsOrdreDialogOpen} 
                onSuccess={fetchData}
            />

            <CreateEntrepriseDialog 
                open={isCreateEntrepriseOpen} 
                onOpenChange={setIsCreateEntrepriseOpen} 
                onSuccess={fetchData}
            />

            <CreateStationDialog 
                open={isCreateStationOpen} 
                onOpenChange={setIsCreateStationOpen} 
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
}
