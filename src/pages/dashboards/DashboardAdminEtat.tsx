import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Building2,
    Fuel,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    ShieldCheck,
    Truck,
    Ship,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    BarChart3,
    Users,
    FileText,
    Download,
    ShieldAlert,
    SearchCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { OrdreRavitaillementDialog } from '@/components/dashboard/OrdreRavitaillementDialog';

interface AdminStats {
    totalEntreprises: number;
    totalStations: number;
    ordersPending: number;
    totalImportations: number;
    stationsPending: number;
    entreprisesPending: number;
}

export default function DashboardAdminEtat() {
    const { role } = useAuth();
    const { toast } = useToast();
    const [stats, setStats] = useState<AdminStats>({
        totalEntreprises: 0,
        totalStations: 0,
        ordersPending: 0,
        totalImportations: 0,
        stationsPending: 0,
        entreprisesPending: 0,
    });
    const [stations, setStations] = useState<Station[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
    const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrdreDialogOpen, setIsOrdreDialogOpen] = useState(false);

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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resEntreprises, resStations, resOrders, resImportations, resRawStations, resAlerts, resFraud] = await Promise.all([
                supabase.from('entreprises').select('*', { count: 'exact', head: true }),
                supabase.from('stations').select('*', { count: 'exact', head: true }),
                supabase.from('ordres_livraison').select('*, station:stations(nom, entreprise:entreprises(sigle))').in('statut', ['en_attente', 'approuve', 'en_cours']).order('created_at', { ascending: false }).limit(5),
                supabase.from('importations').select('*', { count: 'exact', head: true }).neq('statut', 'termine'),
                supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)'),
                supabase.from('alertes').select('*').eq('resolu', false).order('created_at', { ascending: false }).limit(3),
                supabase.from('fraud_alerts' as any).select('*, station:stations(nom)').eq('is_resolved', false).order('created_at', { ascending: false }).limit(3)
            ]);

            const [resAllOrdersCount, resEntreprisesPending, resStationsPending] = await Promise.all([
                supabase.from('ordres_livraison').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
                supabase.from('entreprises').select('*', { count: 'exact', head: true }).eq('statut', 'attente_validation'),
                supabase.from('stations').select('*', { count: 'exact', head: true }).eq('statut', 'attente_validation')
            ]);

            setStats({
                totalEntreprises: resEntreprises.count || 0,
                totalStations: resStations.count || 0,
                ordersPending: resAllOrdersCount.count || 0,
                totalImportations: resImportations.count || 0,
                stationsPending: resStationsPending.count || 0,
                entreprisesPending: resEntreprisesPending.count || 0,
            });

            setRecentOrders(resOrders.data || []);
            setRecentAlerts(resAlerts.data || []);
            setFraudAlerts((resFraud as any).data || []);

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
            console.error('Error fetching admin data:', error);
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
                title: 'RAPPORT NATIONAL DE SITUATION ENERGETIQUE',
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
        signerRole: currentUserRole || 'admin_etat',
        signerName: profile?.full_name || undefined
      });
        } catch (error) {
            console.error('Error generating report:', error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Compagnie', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Stations'];
            const data = stations.reduce((acc: any[], s) => {
                const existing = acc.find(e => (e as any).nom === s.entrepriseNom);
                if (existing) {
                    existing.stockEssence += s.stockActuel.essence;
                    existing.stockGasoil += s.stockActuel.gasoil;
                    existing.stations += 1;
                } else {
                    acc.push({
                        nom: s.entrepriseNom,
                        stockEssence: s.stockActuel.essence,
                        stockGasoil: s.stockActuel.gasoil,
                        stations: 1
                    });
                }
                return acc;
            }, []).map((e: any) => [e.nom, e.stockEssence, e.stockGasoil, e.stations]);

            await generateExcelReport({
                title: 'CONSOLIDATION NATIONALE DES STOCKS — SIHG',
                filename: `Etat_National_Stocks_${new Date().toISOString().slice(0, 10)}`,
                headers,
                data,
                signerRole: 'admin_etat',
                signerName: profile?.full_name || 'Administrateur Central'
            });
        } catch (error) {
            console.error('Error generating excel:', error);
        }
    };

    const { role: currentUserRole, profile } = useAuth();

    const roleLabel = useMemo(() => {
        if (currentUserRole === 'directeur_general') return 'Directeur Général (Admin central État)';
        if (currentUserRole === 'directeur_adjoint') return 'Directeur Général Adjoint (Admin central État)';
        if (currentUserRole === 'super_admin') return 'Super Administrateur';
        return 'Administrateur État';
    }, [currentUserRole]);

    return (
        <DashboardLayout
            title={`Pilotage ${roleLabel}`}
            subtitle="Organe de Régulation et de Supervision Étatique (SONAP)"
        >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-1 bg-primary rounded-full" />
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                            Pilotage {roleLabel} SONAP
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Supervision stratégique et régulation nationale
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 bg-white/50 border-slate-200">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold"
                        onClick={handleExportExcel}
                    >
                        <Download className="h-4 w-4" />
                        Excel Certifié
                    </Button>
                    <Button 
                        size="sm" 
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold"
                        onClick={handleGenerateReport}
                    >
                        <FileText className="h-4 w-4" />
                        PDF National
                    </Button>
                    {(['admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'directeur_general', 'directeur_adjoint'].includes(role || '')) && (
                        <Button 
                            size="sm" 
                            className="gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 font-bold"
                            onClick={() => setIsOrdreDialogOpen(true)}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Ordre Ravitaillement
                        </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold" asChild>
                        <Link to="/admin/commandes">
                            <Truck className="h-4 w-4" />
                            Commandes Flux
                            {stats.ordersPending > 0 && (
                                <Badge className="ml-1 bg-indigo-600 text-white font-bold">{stats.ordersPending}</Badge>
                            )}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Cartes de Statistiques Métier */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Compagnies Agréées" value={stats.totalEntreprises} subtitle="Acteurs enregistrées" icon={Building2} />
                <StatCard title="Parc de Stations" value={stats.totalStations} subtitle="Points de distribution" icon={Fuel} />
                <StatCard
                    title="Commandes en Attente"
                    value={stats.ordersPending}
                    subtitle="Validation requise"
                    icon={Clock}
                    variant={stats.ordersPending > 0 ? 'warning' : 'success'}
                />
                <StatCard
                    title="Importations Actives"
                    value={stats.totalImportations}
                    subtitle="Navires en mouvement"
                    icon={Ship}
                    variant="primary"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.stationsPending > 0 && (
                    <StatCard title="Stations à Valider" value={stats.stationsPending} subtitle="Dossiers en attente" icon={ShieldCheck} variant="warning" />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* État de l'Autonomie Nationale */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <TrendingUp className="h-32 w-32" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <BarChart3 className="h-5 w-5 text-primary-foreground" />
                                Autonomie Énergétique Nationale
                            </CardTitle>
                            <CardDescription className="text-white/60">Estimations basées sur les stocks consolidés et la consommation moyenne</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-4">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <NationalAutonomyGauge daysRemaining={autonomie.essence} fuelType="essence" />
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between text-xs text-white/40 uppercase">
                                            <span>Stock Total</span>
                                            <span>{totalStock.essence.toLocaleString('fr-GN')} L</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <NationalAutonomyGauge daysRemaining={autonomie.gasoil} fuelType="gasoil" />
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between text-xs text-white/40 uppercase">
                                            <span>Stock Total</span>
                                            <span>{totalStock.gasoil.toLocaleString('fr-GN')} L</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alertes Récentes */}
                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500" />
                                    Alertes Critiques du Secteur
                                </CardTitle>
                                <CardDescription>Incidents nécessitant une attention administrative</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/alertes">Voir tout <ChevronRight className="h-4 w-4 ml-1" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentAlerts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500/20 mb-2" />
                                        <p className="text-xs font-medium">Aucune alerte active</p>
                                    </div>
                                ) : (
                                    recentAlerts.map((alert) => (
                                        <div key={alert.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 group hover:bg-slate-50 transition-colors">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                                alert.niveau === 'critique' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                            )}>
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold truncate">{alert.message}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">{alert.type}</p>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] uppercase font-bold",
                                                alert.niveau === 'critique' ? 'border-red-200 text-red-600 bg-red-50' : 'border-orange-200 text-orange-600 bg-orange-50'
                                            )}>
                                                {alert.niveau}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Center - Anti-Fraud Alerts */}
                    <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldAlert className="h-24 w-24" />
                        </div>
                        <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
                            <CardTitle className="text-md font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                Centre National de Sécurité
                            </CardTitle>
                            <CardDescription className="text-white/40 text-[10px] font-bold uppercase tracking-tighter">Détection de fraude et anomalies logistiques</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {fraudAlerts.length === 0 ? (
                                <div className="py-8 text-center opacity-30">
                                    <CheckCircle2 className="mx-auto h-8 w-8 mb-2" />
                                    <p className="text-[10px] uppercase font-black tracking-widest">Ensemble du réseau intègre</p>
                                </div>
                            ) : (
                                fraudAlerts.map((fraud) => (
                                    <div key={fraud.id} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge className={cn(
                                                "text-[8px] font-black uppercase border-none",
                                                fraud.severity === 'high' || fraud.severity === 'critical' ? "bg-red-500 text-white" : "bg-orange-500 text-white"
                                            )}>
                                                {fraud.type.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-[9px] font-mono text-white/30">{format(new Date(fraud.created_at), 'dd/MM HH:mm')}</span>
                                        </div>
                                        <p className="text-xs font-bold leading-tight mb-1">{fraud.details?.message || 'Anomalie détectée'}</p>
                                        <p className="text-[10px] text-white/40 italic truncate">{fraud.station?.nom}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full mt-2 h-7 text-[9px] uppercase font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                            onClick={() => toast({ 
                                                title: "Enquête Initiée", 
                                                description: `Une équipe d'inspection sera dépêchée à la station ${fraud.station?.nom} sous 24h.` 
                                            })}
                                        >
                                            <SearchCheck className="mr-1 h-3 w-3" />
                                            Lancer une Enquête
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-lg h-full">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Agréments en Attente
                        </CardTitle>
                        <CardDescription>Nouvelles entreprises et stations à valider</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(stats.entreprisesPending + stats.stationsPending) === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                    <Building2 className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Réseau à jour : 0 attente</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-sm font-bold text-amber-900">Demandes DSA</span>
                                        </div>
                                        <Badge variant="outline" className="border-amber-200 text-amber-800 bg-white font-black">{stats.entreprisesPending + stats.stationsPending}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" className="h-9 text-[10px] uppercase font-black bg-white" asChild>
                                            <Link to="/entreprises?statut=attente_validation">Entreprises</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-9 text-[10px] uppercase font-black bg-white" asChild>
                                            <Link to="/stations?activeTab=pending">Stations</Link>
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic text-center px-4">
                                    Les nouvelles entités créées par la Direction des Services Aval (DSA) nécessitent une vérification de conformité avant activation.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* File d'attente de Validation */}
                <Card className="lg:col-span-1 border-none shadow-lg h-full">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Validation Commandes
                        </CardTitle>
                        <CardDescription>Flux de ravitaillement à autoriser</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-sm text-muted-foreground">Aucune commande en attente</p>
                            </div>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-3 translate-x-3 -translate-y-3 opacity-0 group-hover:opacity-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                                        <Truck className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase">{order.station?.entreprise?.sigle}</Badge>
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase",
                                                order.statut === 'en_cours' ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                                            )}>{order.statut?.replace('_', ' ')}</Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{order.station?.nom}</h4>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-600 capitalize">{order.carburant} :</span>
                                        <span className="text-xs font-black text-slate-900">{order.quantite_demandee.toLocaleString()} L</span>
                                    </div>
                                    {order.notes && order.notes.includes('---') && (
                                        <div className="mt-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                            <p className="text-[10px] font-bold text-blue-800 uppercase flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3" /> Répondu par l'entreprise
                                            </p>
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" className="w-full mt-4 h-8 text-[10px] uppercase font-bold tracking-wider hover:bg-primary hover:text-white transition-all" asChild>
                                        <Link to="/admin/commandes">Accéder au suivi</Link>
                                    </Button>
                                </div>
                            ))
                        )}

                        {stats.ordersPending > 5 && (
                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" asChild>
                                <Link to="/admin/commandes">Voir les {stats.ordersPending - 5} autres...</Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
            </div>

            {/* Raccourcis Administratifs */}
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                Actions de Régulation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/dashboard/inspecteur">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-cyan-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-cyan-600 shadow-md">
                                <ShieldCheck className="h-7 w-7 text-cyan-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Inspection Terrain</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Superviser les contrôles et signalements</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/entreprises">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-emerald-600 shadow-md">
                                <Building2 className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Entreprises</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Gérer les agréments et quotas nationaux</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/stations">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-emerald-600 shadow-md">
                                <Fuel className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Stations</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Validation et supervision du réseau territorial</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/importations">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-emerald-600 shadow-md">
                                <Ship className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Importations</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Suivi des navires et approvisionnement central</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/utilisateurs">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-purple-600 shadow-md">
                                <Users className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Utilisateurs</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Créer des comptes et attribuer les rôles</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group border-none bg-white">
                    <Link to="/rapports">
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-all group-hover:bg-amber-600 shadow-md">
                                <BarChart3 className="h-7 w-7 text-amber-600 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="font-bold text-slate-800">Rapports</h4>
                            <p className="text-xs text-muted-foreground text-center mt-1 px-4">Synthèse nationale et analyses de consommation</p>
                        </CardContent>
                    </Link>
                </Card>
            </div>
            
            {/* Rappels de Sécurité SONAP */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <ShieldCheck size={20} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 leading-none">Vigilance Anti-Fraude</h4>
                    <p className="text-[11px] text-indigo-800/80 font-medium leading-relaxed">
                        Le système SIHG analyse en temps réel les écarts de stock. Toute variation supérieure à 2% sans justificatif déclenche une alerte au Centre National de Sécurité.
                    </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-slate-100 border border-slate-200 space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                        <Users size={20} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">Authentification Forte</h4>
                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                        Chaque validation d'ordre ou de quota est tracée. Ne partagez jamais vos identifiants. Les sessions administratives expirent après 30 minutes d'inactivité.
                    </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-200 space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg">
                        <FileText size={20} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900 leading-none">Transparence Totale</h4>
                    <p className="text-[11px] text-amber-800/80 font-medium leading-relaxed">
                        Les rapports générés (PDF/Excel) contiennent des hashs numériques d'intégrité. Seuls les documents signés numériquement par la SONAP font foi.
                    </p>
                </div>
            </div>

            <OrdreRavitaillementDialog 
                open={isOrdreDialogOpen} 
                onOpenChange={setIsOrdreDialogOpen}
                onSuccess={fetchData} 
            />
        </DashboardLayout>
    );
}
