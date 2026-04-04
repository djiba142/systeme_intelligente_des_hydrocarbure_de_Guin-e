import { useEffect, useState, useCallback } from 'react';
import {
  Fuel, AlertTriangle, CheckCircle2, MapPin, Building2,
  Phone, Mail, Clock, Plus, History, Loader2, ChevronRight,
  TrendingUp, TrendingDown, ShieldCheck, Activity, FileText,
  BarChart3, PieChart, Package, Truck, Info, Download, Filter,
  RefreshCw, Search, Zap, AlertCircle, BadgeCheck, Settings,
  ArrowRight, Layers, LayoutDashboard, Ship
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { DialogOrdresEtat } from '@/components/dashboard/DialogOrdresEtat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';

interface Station {
  id: string;
  nom: string;
  code: string;
  ville: string;
  stock_essence: number;
  stock_gasoil: number;
  capacite_essence: number;
  capacite_gasoil: number;
  statut: string;
}

interface Entreprise {
  id: string;
  nom: string;
  sigle: string;
  type: string;
  logo_url: string | null;
  quota_essence: number;
  quota_gasoil: number;
  statut: string;
  numero_agrement: string;
}

interface LivraisonLogistique {
    id: string;
    station_nom: string;
    produit: string;
    quantite_prevue: number;
    statut: string;
    date_depart: string;
    chauffeur_nom: string;
    camion_plaque: string;
}

export default function DashboardEntreprise() {
  const { profile, role: currentUserRole } = useAuth();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [livraisons, setLivraisons] = useState<LivraisonLogistique[]>([]);
  const [ordresEtatCount, setOrdresEtatCount] = useState(0);
  const [isOrdresEtatDialogOpen, setIsOrdresEtatDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStockEssence: 0,
    totalStockGasoil: 0,
    consoEssence: 0,
    consoGasoil: 0,
  });
  const [monthlyQuota, setMonthlyQuota] = useState({ essence: 0, gasoil: 0 });
  const [sonapCircuit, setSonapCircuit] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      let targetId = profile?.entreprise_id;
      
      const now = new Date();
      const mois = now.getMonth() + 1;
      const annee = now.getFullYear();

      if (!targetId && (currentUserRole === 'super_admin' || currentUserRole === 'admin_etat')) {
        // Aggregate Mode
        const [stationsRes, ventesRes, quotaRes] = await Promise.all([
          supabase.from('stations').select('*'),
          (supabase as any).from('ventes').select('quantite_litres, carburant'),
          supabase.from('quotas_entreprises' as any).select('*').eq('mois', mois).eq('annee', annee)
        ]);

        const stationsList = (stationsRes.data as Station[]) || [];
        setStations(stationsList);

        const totalEssence = stationsList.reduce((acc, s) => acc + (s.stock_essence || 0), 0);
        const totalGasoil = stationsList.reduce((acc, s) => acc + (s.stock_gasoil || 0), 0);

        const sales = (ventesRes.data as any[]) || [];
        const consoEssence = sales.filter(v => v.carburant === 'essence').reduce((acc, v) => acc + v.quantite_litres, 0);
        const consoGasoil = sales.filter(v => v.carburant === 'gasoil').reduce((acc, v) => acc + v.quantite_litres, 0);

        setStats({
          totalStockEssence: totalEssence,
          totalStockGasoil: totalGasoil,
          consoEssence,
          consoGasoil
        });

        const qEss = (quotaRes.data as any[])?.filter(q => q.produit === 'essence')?.reduce((acc, q) => acc + (q.quantite_allouee || 0), 0) || 0;
        const qGas = (quotaRes.data as any[])?.filter(q => q.produit === 'gasoil')?.reduce((acc, q) => acc + (q.quantite_allouee || 0), 0) || 0;
        setMonthlyQuota({ essence: qEss, gasoil: qGas });

        setEntreprise({
          id: 'global-network',
          nom: 'Réseau National des Distributeurs',
          sigle: 'GLOBAL',
          type: 'Vue de synthèse nationale',
          logo_url: sonapLogo,
          quota_essence: qEss || 5000000,
          quota_gasoil: qGas || 8000000,
          statut: 'actif',
          numero_agrement: 'N/A'
        });

      } else if (targetId) {
        // Single Enterprise Mode
        const [entRes, stationsRes, ventesRes, quotaRes] = await Promise.all([
          supabase.from('entreprises').select('*').eq('id', targetId).maybeSingle(),
          supabase.from('stations').select('*').eq('entreprise_id', targetId),
          (supabase as any).from('ventes').select('quantite_litres, carburant').eq('entreprise_id', targetId),
          supabase.from('quotas_entreprises' as any).select('*').eq('entreprise_id', targetId).eq('mois', mois).eq('annee', annee)
        ]);

        if (entRes.data) setEntreprise(entRes.data as any as Entreprise);
        
        const stationsList = (stationsRes.data as Station[]) || [];
        setStations(stationsList);

        if (stationsList.length > 0) {
            const { count: pendingOrders } = await supabase
                .from('ordres_livraison')
                .select('*', { count: 'exact', head: true })
                .in('station_id', stationsList.map(s => s.id))
                .eq('statut', 'approuve');
                
            setOrdresEtatCount(pendingOrders || 0);
        } else {
            setOrdresEtatCount(0);
        }

        const totalEssence = stationsList.reduce((acc, s) => acc + (s.stock_essence || 0), 0);
        const totalGasoil = stationsList.reduce((acc, s) => acc + (s.stock_gasoil || 0), 0);

        const sales = (ventesRes.data as any[]) || [];
        const consoEssence = sales.filter(v => v.carburant === 'essence').reduce((acc, v) => acc + v.quantite_litres, 0);
        const consoGasoil = sales.filter(v => v.carburant === 'gasoil').reduce((acc, v) => acc + v.quantite_litres, 0);

        setStats({
          totalStockEssence: totalEssence,
          totalStockGasoil: totalGasoil,
          consoEssence,
          consoGasoil
        });

        const entData = entRes.data as any;
        const qEss = (quotaRes.data as any[])?.find(q => q.produit === 'essence')?.quantite_allouee || entData?.quota_essence || 0;
        const qGas = (quotaRes.data as any[])?.find(q => q.produit === 'gasoil')?.quantite_allouee || entData?.quota_gasoil || 0;
        setMonthlyQuota({ essence: qEss, gasoil: qGas });

        // Fetch Recent Deliveries (Logistics)
        const { data: livData } = await supabase
            .from('livraisons')
            .select(`
                id,
                produit,
                quantite_prevue,
                statut,
                date_depart,
                chauffeur_nom,
                camion_plaque,
                stations(nom)
            `)
            .eq('entreprise_id', targetId)
            .order('date_depart', { ascending: false })
            .limit(10);
        
        setLivraisons((livData as any[])?.map(l => ({
            ...l,
            station_nom: (l as any).stations?.nom || 'N/A'
        })) || []);

        // Fetch Global SONAP Circuit for transparency
        const { data: globalCircuit } = await (supabase as any)
            .from('import_dossiers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        setSonapCircuit(globalCircuit || []);

      } else {
        setLoading(false);
        return;
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.entreprise_id, currentUserRole]);

    useEffect(() => {
        fetchData();

        // Écoute en temps réel des nouveaux ordres de ravitaillement
        const channel = supabase.channel('realtime_ordres_livraison')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ordres_livraison' },
                () => {
                    toast({
                        title: "Mise à jour d'Ordre",
                        description: "Vous avez reçu de nouvelles instructions de l'État ou une mise à jour d'un statut.",
                    });
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, toast]);

    if (loading) {
    return (
      <DashboardLayout title="Chargement..." subtitle="Vérification des accès">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const remainingEssence = (monthlyQuota.essence || 0) - stats.consoEssence;
  const remainingGasoil = (monthlyQuota.gasoil || 0) - stats.consoGasoil;

  const handleExportPDF = async () => {
    if (!entreprise) return;
    try {
      toast({ title: "Génération du rapport...", description: "Ceci peut prendre quelques secondes." });
      await generateCustomReportPDF({
        type: 'stock-national',
        title: `BILAN OPÉRATIONNEL - ${entreprise.sigle}`,
        entrepriseLogo: entreprise.logo_url || undefined,
        data: {
            stats_globales: {
                total_stations: stations.length,
                stock_total: stats.totalStockEssence + stats.totalStockGasoil,
                conso_periode: stats.consoEssence + stats.consoGasoil
            },
            entreprises: [{
                nom: entreprise.nom,
                sigle: entreprise.sigle,
                stockEssence: stats.totalStockEssence,
                stockGasoil: stats.totalStockGasoil,
                stations: stations.length
            }]
        },
        signerRole: 'responsable_entreprise'
      });
      toast({ title: "Rapport PDF généré !" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer le rapport PDF." });
    }
  };

  const handleExportExcel = async () => {
    if (!entreprise) return;
    try {
        const headers = ['Station', 'Code', 'Ville', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Statut'];
        const data = stations.map(s => [
            s.nom,
            s.code,
            s.ville,
            s.stock_essence,
            s.stock_gasoil,
            s.statut
        ]);

        await generateExcelReport({
            title: `RÉSEAU STATIONS - ${entreprise.nom}`,
            filename: `reseau_${entreprise.sigle.toLowerCase()}.xlsx`,
            headers,
            data,
            signerRole: currentUserRole || 'responsable_entreprise',
            signerName: profile?.full_name || entreprise.nom
        });
        toast({ title: "Rapport Excel généré !" });
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer le rapport Excel." });
    }
  };

  return (
    <DashboardLayout 
      title={
        currentUserRole === 'responsable_entreprise' ? "Direction Générale — Entreprise Pétrolière" : 
        currentUserRole === 'responsable_stations' ? "Gestion du Réseau & Stations-Service" :
        currentUserRole === 'gestionnaire_livraisons' ? "Gestionnaire des Livraisons & Flux" :
        "Direction Logistique — Coordination des Flux"
      }
      subtitle={entreprise?.nom || "Représentant Officiel SIHG"}
    >
      {/* Profil Header */}
      <div className="mb-10 p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-premium relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-white/5 p-4 shadow-inner border border-slate-100 dark:border-white/5 flex items-center justify-center">
            <img src={entreprise?.logo_url || logo} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">{entreprise?.nom}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">CERTIFIÉ SONAP</Badge>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                {entreprise?.type || 'Distributeur'} 
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                {stations.length} Points de Distribution
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-10 rounded-xl border-slate-200 font-bold px-4">
                Excel
             </Button>
             <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-10 rounded-xl border-slate-200 font-bold px-4">
                PDF
             </Button>
          </div>
        </div>
      </div>

      {/* Stats Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Quota Mensuel Essence</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-400">{monthlyQuota.essence.toLocaleString()} L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2 text-emerald-200/50">
              <span>Utilisé : {stats.consoEssence.toLocaleString()} L</span>
              <span>{Math.round((stats.consoEssence / (monthlyQuota.essence || 1)) * 100)}%</span>
            </div>
            <Progress value={(stats.consoEssence / (monthlyQuota.essence || 1)) * 100} className="h-2 bg-white/10 group-hover:scale-y-110 transition-transform" />
            <p className="mt-4 text-[10px] font-bold text-slate-500 italic">Solde restant : {Math.max(0, remainingEssence).toLocaleString()} L</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Quota Mensuel Gasoil</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-400">{monthlyQuota.gasoil.toLocaleString()} L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2 text-blue-200/50">
              <span>Utilisé : {stats.consoGasoil.toLocaleString()} L</span>
              <span>{Math.round((stats.consoGasoil / (monthlyQuota.gasoil || 1)) * 100)}%</span>
            </div>
            <Progress value={(stats.consoGasoil / (monthlyQuota.gasoil || 1)) * 100} className="h-2 bg-white/10 group-hover:scale-y-110 transition-transform" />
            <p className="mt-4 text-[10px] font-bold text-slate-500 italic">Solde restant : {Math.max(0, remainingGasoil).toLocaleString()} L</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border border-slate-100 group">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Stock Total Essence (Réseau)</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-900">{stats.totalStockEssence.toLocaleString()} L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp size={16} className="animate-bounce" />
              <span className="text-xs font-bold uppercase">Disponibilité optimale</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
               {stations.filter(s => s.stock_essence < (s.capacite_essence * 0.15)).length > 0 && (
                 <Badge variant="destructive" className="bg-red-500 text-white text-[9px] font-black">{stations.filter(s => s.stock_essence < (s.capacite_essence * 0.2)).length} RUPTURES IMMINENTES</Badge>
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border border-slate-100 group">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Stock Total Gasoil (Réseau)</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-900">{stats.totalStockGasoil.toLocaleString()} L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-blue-600">
              <Activity size={16} />
              <span className="text-xs font-bold uppercase">Surveillance active</span>
            </div>
            <div className="mt-6">
               <p className="text-[10px] font-bold text-slate-400 italic">Couverture estimée : 12 Jours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stations" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-auto">
            <TabsTrigger value="stations" className="rounded-xl font-black uppercase tracking-tighter text-[10px] px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Réseau Stations</TabsTrigger>
            <TabsTrigger value="logistique" className="rounded-xl font-black uppercase tracking-tighter text-[10px] px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Logistique & Flux</TabsTrigger>
            <TabsTrigger value="sonap" className="rounded-xl font-black uppercase tracking-tighter text-[10px] px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Flux National SONAP</TabsTrigger>
            <TabsTrigger value="conso" className="rounded-xl font-black uppercase tracking-tighter text-[10px] px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Consommation</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Parc des Stations-Service</CardTitle>
                                    <CardDescription className="text-xs font-bold text-slate-400 italic">Inventaire et état des cuves en temps réel.</CardDescription>
                                </div>
                                <Badge className="bg-slate-900 text-white font-black px-4 py-1 rounded-lg">TOTAL : {stations.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Station</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Essence</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Gasoil</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {stations.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{s.nom}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{s.ville} — {s.code}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                                    {s.stock_essence.toLocaleString()} L
                                                    <Progress value={(s.stock_essence / s.capacite_essence) * 100} className="h-1 mt-2 w-24 bg-slate-100" />
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                                    {s.stock_gasoil.toLocaleString()} L
                                                    <Progress value={(s.stock_gasoil / s.capacite_gasoil) * 100} className="h-1 mt-2 w-24 bg-slate-100 font-bold" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={cn(
                                                        "font-black text-[9px] uppercase",
                                                        s.statut === 'ouverte' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                                                    )}>
                                                        {s.statut}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-white hover:shadow-md" asChild>
                                                        <Link to={`/stations/${s.id}`}>
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                        <CardHeader className="p-8">
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Alertes de Stock Critiques
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-4">
                           {stations.filter(s => s.stock_essence < (s.capacite_essence * 0.15) || s.stock_gasoil < (s.capacite_gasoil * 0.15)).length === 0 ? (
                             <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/10 text-slate-400 text-xs font-bold flex items-center gap-3">
                               <CheckCircle2 size={16} className="text-emerald-400" />
                               Aucun point de rupture détecté.
                             </div>
                           ) : (
                             stations.filter(s => s.stock_essence < (s.capacite_essence * 0.15) || s.stock_gasoil < (s.capacite_gasoil * 0.15)).map(s => (
                               <div key={s.id} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white/5 border border-white/10">
                                 <div>
                                   <p className="text-xs font-black text-white uppercase">{s.nom}</p>
                                   <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Niveau Bas détecté</p>
                                 </div>
                                 <Badge className="bg-red-500/20 text-red-400 font-black text-[9px] border border-red-500/30">RUPTURE</Badge>
                               </div>
                             ))
                           )}
                        </CardContent>
                        <CardFooter className="px-8 pb-8">
                             <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-[1.2rem] h-12 font-black uppercase text-[10px] tracking-widest"
                                onClick={() => {
                                    if (['responsable_entreprise', 'operateur_entreprise', 'gestionnaire_livraisons'].includes(currentUserRole || '')) {
                                        setIsOrdresEtatDialogOpen(true);
                                    } else {
                                        toast({ title: "Accès Restriction", description: "Seuls la Direction ou le Gestionnaire Livraisons peuvent planifier un approvisionnement." });
                                    }
                                }}
                             >
                                Planifier Approvisionnement
                             </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="logistique" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Coordination des Flux Logistiques</CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400 italic">Suivi des ordres de livraisons et des camions en circulation.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible / Station</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transport</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut Flux</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {livraisons.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-4">
                                                <p className="text-sm font-black text-slate-900">{l.station_nom}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Date prev : {l.date_depart ? new Date(l.date_depart).toLocaleDateString() : 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold uppercase text-[9px]">{l.produit}</Badge>
                                                <p className="text-xs font-black mt-1">{l.quantite_prevue.toLocaleString()} L</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-700">{l.chauffeur_nom || 'Non assigné'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{l.camion_plaque || 'Sans plaque'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-2 w-2 rounded-full", 
                                                        l.statut === 'terminee' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                                    )} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{l.statut}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {livraisons.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic text-sm">
                                                Aucune livraison active pour le moment.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-emerald-50 text-emerald-900">
                        <CardHeader className="p-8">
                            <CardTitle className="text-sm font-black uppercase">Capacité Logistique Moblisable</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 flex flex-col items-center justify-center text-center">
                            <Truck size={48} className="mb-4 text-emerald-600 opacity-20" />
                            <h3 className="text-4xl font-black tracking-tighter">05</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Citernes prêtes au départ</p>
                        </CardContent>
                    </Card>
                    {['responsable_entreprise', 'gestionnaire_livraisons', 'operateur_entreprise'].includes(currentUserRole || '') && (
                        <Card 
                            className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-blue-50 text-blue-900 cursor-pointer hover:shadow-lg hover:bg-blue-100 transition-all border border-blue-100 relative group"
                            onClick={() => setIsOrdresEtatDialogOpen(true)}
                        >
                            {ordresEtatCount > 0 && (
                                <span className="absolute top-4 right-4 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                                </span>
                            )}
                            <CardHeader className="p-8">
                                <CardTitle className="text-sm font-black uppercase group-hover:text-blue-700 transition-colors">Ordres de l'État en attente</CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 flex flex-col items-center justify-center text-center">
                                <FileText size={48} className={cn("mb-4 transition-all duration-300", ordresEtatCount > 0 ? "text-blue-500 opacity-100 scale-110" : "text-blue-600 opacity-20")} />
                                <h3 className="text-4xl font-black tracking-tighter">{ordresEtatCount.toString().padStart(2, '0')}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Autorisations à exécuter</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </TabsContent>

        <TabsContent value="sonap" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 text-white">
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-slate-900">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <Ship className="text-emerald-400" /> Circuit Approvisionnement National
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium italic">Transparence sur l'arrivée des cargaisons pour les partenaires distributeurs.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/5" />
                                <div className="space-y-8">
                                    {(sonapCircuit || []).map((d: any, idx: number) => (
                                        <div key={d.id} className="relative pl-12">
                                            <div className={cn(
                                                "absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-slate-900 z-10",
                                                idx === 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-700"
                                            )} />
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-sm font-black uppercase tracking-tight">{d.navire_nom || 'Cargaison Globale'}</h4>
                                                    <Badge className="bg-white/10 text-white font-black text-[8px] uppercase border-none">{d.statut?.replace('_', ' ')}</Badge>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{d.carburant} — {d.quantite_prevue?.toLocaleString()} T</p>
                                                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: d.statut === 'receptionne' ? '100%' : d.statut === 'arrive_conakry' ? '75%' : d.statut === 'en_transit' ? '40%' : '10%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!sonapCircuit || sonapCircuit.length === 0) && (
                                        <div className="text-center py-10 opacity-30">
                                            <Ship size={40} className="mx-auto mb-4" />
                                            <p className="text-xs font-black uppercase">Aucun mouvement maritime signalé</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="space-y-6">
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-50 p-8">
                        <TrendingUp className="text-indigo-600 mb-4" />
                        <h4 className="text-sm font-black uppercase text-indigo-900 mb-2">Impact sur vos Quotas</h4>
                        <p className="text-[11px] text-indigo-700/70 font-medium italic leading-relaxed">
                            L'arrivée de nouvelles cargaisons sécurise les quotas alloués pour le mois prochain. La SONAP priorise les distributeurs ayant un taux d'exécution élevé.
                        </p>
                    </Card>
                 </div>
             </div>
        </TabsContent>

        <TabsContent value="conso" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tighter leading-none">Analyse de la Distribution</CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-400 italic mt-2">Ventes cumulées sur les 30 derniers jours.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-xl h-10 px-4 font-bold text-primary gap-2 bg-primary/5" asChild>
                            <Link to="/rapports"><TrendingUp size={16} /> Détail</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 flex items-center justify-center h-[350px]">
                        <div className="flex flex-col items-center opacity-10">
                            <BarChart3 size={80} className="mb-6" />
                            <p className="font-black uppercase tracking-[0.3em] text-sm">Indicateurs Consommation Réseau</p>
                        </div>
                    </CardContent>
                 </Card>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
                    <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] p-8 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Vendu (Réseau)</p>
                        <h4 className="text-4xl font-black tracking-tighter">{(stats.consoEssence + stats.consoGasoil).toLocaleString()} L</h4>
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-emerald-400">Essence</span>
                                <span>{stats.consoEssence.toLocaleString()} L</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-blue-400">Gasoil</span>
                                <span>{stats.consoGasoil.toLocaleString()} L</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-[2rem] p-8 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Taux d'Exécution Quotas</p>
                        <h4 className="text-4xl font-black tracking-tighter">
                            {Math.round(((stats.consoEssence + stats.consoGasoil) / ((monthlyQuota.essence + monthlyQuota.gasoil) || 1)) * 100)} %
                        </h4>
                        <Progress 
                            value={((stats.consoEssence + stats.consoGasoil) / ((monthlyQuota.essence + monthlyQuota.gasoil) || 1)) * 100} 
                            className="h-2 bg-black/10 transition-all rounded-full" 
                        />
                         <p className="text-[10px] font-bold text-white/50 italic">Capacité restante absorbable par le marché.</p>
                    </Card>
                 </div>
            </div>
        </TabsContent>
      </Tabs>

      <DialogOrdresEtat 
        open={isOrdresEtatDialogOpen} 
        onOpenChange={setIsOrdresEtatDialogOpen} 
        entrepriseId={profile?.entreprise_id}
        onOrderUpdate={fetchData}
      />
    </DashboardLayout>
  );
}
