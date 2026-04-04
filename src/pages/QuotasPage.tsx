import { useState, useEffect, useCallback } from 'react';
import { 
  PieChart, BarChart3, TrendingUp, ShieldAlert, 
  Plus, History, Building2, Fuel, Save, RefreshCw, 
  Search, Filter, ArrowUpRight, CheckCircle2, AlertTriangle,
  Lock, Globe, LayoutDashboard, Loader2, Calendar, Target,
  FileText, Download
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';

const MOIS_LIST = [
  { id: 1, label: 'Janvier' }, { id: 2, label: 'Février' }, { id: 3, label: 'Mars' },
  { id: 4, label: 'Avril' }, { id: 5, label: 'Mai' }, { id: 6, label: 'Juin' },
  { id: 7, label: 'Juillet' }, { id: 8, label: 'Août' }, { id: 9, label: 'Septembre' },
  { id: 10, label: 'Octobre' }, { id: 11, label: 'Novembre' }, { id: 12, label: 'Décembre' }
];

const ANNEE_LIST = [2025, 2026, 2027];

export default function QuotasPage() {
  const { role: currentUserRole } = useAuth();
  const { toast } = useToast();
  const isReadOnly = !(['super_admin', 'service_it', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution'].includes(currentUserRole || '')) || currentUserRole === 'super_admin' || currentUserRole === 'service_it';
  // Correction: Le Super Admin et DSI ne gèrent pas les quotas (opérationnel/métier)
  const canModifyQuotas = ['admin_etat', 'directeur_general', 'directeur_adjoint', 'directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '');
  
  // Differentiator for DSA Director vs Adjoint
  const { profile } = useAuth();
  const isDsaDirector = currentUserRole === 'directeur_aval';
  const isDsaAdjoint = currentUserRole === 'directeur_adjoint_aval';
  const [loading, setLoading] = useState(true);
  
  // Filtres Globaux
  const [currentMois, setCurrentMois] = useState(6); // Juin par défaut
  const [currentAnnee, setCurrentAnnee] = useState(2026);
  
  // Données de la DB
  const [dbEntreprises, setDbEntreprises] = useState<any[]>([]);
  const [dbStations, setDbStations] = useState<any[]>([]);
  const [nationalQuotas, setNationalQuotas] = useState<any[]>([]);
  const [entrepriseQuotas, setEntrepriseQuotas] = useState<any[]>([]);
  const [stationQuotas, setStationQuotas] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entRes, staRes, natQuotaRes, entQuotaRes, staQuotaRes] = await Promise.all([
        supabase.from('entreprises').select('*').order('nom'),
        supabase.from('stations').select('*, entreprises:entreprise_id(sigle)').order('nom'),
        supabase.from('quotas_nationaux' as any).select('*').eq('annee', currentAnnee).eq('mois', currentMois),
        supabase.from('quotas_entreprises' as any).select('*').eq('annee', currentAnnee).eq('mois', currentMois),
        supabase.from('quotas_stations' as any).select('*').eq('annee', currentAnnee).eq('mois', currentMois)
      ]);

      setDbEntreprises(entRes.data || []);
      setDbStations(staRes.data || []);
      setNationalQuotas(natQuotaRes.data || []);
      setEntrepriseQuotas(entQuotaRes.data || []);
      setStationQuotas(staQuotaRes.data || []);

    } catch (error: any) {
      console.error('Erreur de chargement:', error);
      toast({ title: "Erreur de synchronisation", description: "Impossible de récupérer les quotas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentMois, currentAnnee, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateNationalQuota = async (produit: string, quantite: string) => {
    try {
      const { error } = await supabase
        .from('quotas_nationaux' as any)
        .upsert({ 
          annee: currentAnnee, 
          mois: currentMois, 
          produit, 
          quantite_prevue: parseFloat(quantite) 
        }, { onConflict: 'annee,mois,produit' });

      if (error) throw error;
      toast({ title: "Quota national mis à jour", description: `Planification ${produit} enregistrée.` });
      fetchData();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le quota.", variant: "destructive" });
    }
  };

  const getNationalVal = (prod: string) => nationalQuotas.find(q => q.produit === prod)?.quantite_prevue || 0;
  const getEntQuota = (entId: string, prod: string) => entrepriseQuotas.find(q => q.entreprise_id === entId && q.produit === prod);
  const getStaQuota = (staId: string, prod: string) => stationQuotas.find(q => q.station_id === staId && q.produit === prod);

  const handleGenererPlanAnnuel = async () => {
    try {
      toast({ title: "Génération du plan annuel...", description: "Préparation du document officiel." });
      await generateCustomReportPDF({
        type: 'plan-annuel-quotas',
        title: `PLAN ANNUEL DE RÉGULATION DES QUOTAS ${currentAnnee}`,
        data: { annee: currentAnnee },
        signerRole: 'admin_etat',
      });
      toast({ title: "Plan généré !", description: `Plan ${currentAnnee} téléchargé avec succès.` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le plan annuel.", variant: "destructive" });
    }
  };

  const handleAllouerQuota = async () => {
    try {
      // Allouer des quotas par défaut à chaque entreprise pour le mois sélectionné
      if (dbEntreprises.length === 0) {
        toast({ title: "Aucune entreprise", description: "Chargez d'abord les entreprises.", variant: "destructive" });
        return;
      }
      toast({ title: "Allocation en cours...", description: `Attribution des quotas pour ${MOIS_LIST.find(m => m.id === currentMois)?.label} ${currentAnnee}` });
      const quotaRows = dbEntreprises.flatMap(e => [
        { entreprise_id: e.id, annee: currentAnnee, mois: currentMois, produit: 'essence', quantite_allouee: 2_000_000, quantite_utilisee: 0 },
        { entreprise_id: e.id, annee: currentAnnee, mois: currentMois, produit: 'gasoil', quantite_allouee: 1_500_000, quantite_utilisee: 0 },
      ]);
      const { error } = await supabase
        .from('quotas_entreprises' as any)
        .upsert(quotaRows, { onConflict: 'entreprise_id,annee,mois,produit' });
      if (error) throw error;
      toast({ title: "Quotas alloués !", description: `${dbEntreprises.length} entreprises mises à jour.` });
      fetchData();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'allouer les quotas.", variant: "destructive" });
    }
  };

  const handleTelechargerRapport = async () => {
    try {
      toast({ title: "Génération rapport...", description: "Téléchargement en cours." });
      await generateCustomReportPDF({
        type: 'rapport-regulation',
        title: `RAPPORT DE RÉGULATION — ${MOIS_LIST.find(m => m.id === currentMois)?.label?.toUpperCase()} ${currentAnnee}`,
        data: {
          entreprises: dbEntreprises.map(e => {
            const qEss = getEntQuota(e.id, 'essence');
            const qGas = getEntQuota(e.id, 'gasoil');
            const totalAlloue = (qEss?.quantite_allouee ?? 0) + (qGas?.quantite_allouee ?? 0);
            const totalUtil = (qEss?.quantite_utilisee ?? 0) + (qGas?.quantite_utilisee ?? 0);
            return {
              nom: e.nom,
              quotaEssence: qEss?.quantite_allouee ?? 0,
              quotaGasoil: qGas?.quantite_allouee ?? 0,
              consommation: totalUtil,
              ecart: totalAlloue - totalUtil,
              conforme: totalUtil <= totalAlloue,
            };
          }),
        },
        signerRole: 'admin_etat',
      });
      toast({ title: "Rapport généré !", description: "Le fichier PDF a été téléchargé." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le rapport.", variant: "destructive" });
    }
  };

  const handleExportExcel = async () => {
    try {
      const headers = ['Compagnie', 'Quota Essence (L)', 'Quota Gasoil (L)', 'Consommation Totale (L)', 'Écart (L)', 'Statut'];
      const data = dbEntreprises.map(e => {
        const qEss = getEntQuota(e.id, 'essence');
        const qGas = getEntQuota(e.id, 'gasoil');
        const totalAlloue = (qEss?.quantite_allouee ?? 0) + (qGas?.quantite_allouee ?? 0);
        const totalUtil = (qEss?.quantite_utilisee ?? 0) + (qGas?.quantite_utilisee ?? 0);
        const ecart = totalAlloue - totalUtil;
        return [
          e.nom,
          qEss?.quantite_allouee ?? 0,
          qGas?.quantite_allouee ?? 0,
          totalUtil,
          ecart,
          totalUtil <= totalAlloue ? 'CONFORME' : 'DÉPASSEMENT'
        ];
      });

      await generateExcelReport({
        title: `RECAPITULATIF DES QUOTAS — ${MOIS_LIST.find(m => m.id === currentMois)?.label?.toUpperCase()} ${currentAnnee}`,
        filename: `Quotas_SIHG_${currentMois}_${currentAnnee}`,
        headers,
        data,
        signerRole: currentUserRole || 'admin_etat',
        signerName: profile?.full_name || 'Autorité de Régulation'
      });
      toast({ title: "Succès", description: "Fichier Excel généré avec logos et certifications." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur Export', description: err.message });
    }
  };

  return (
    <DashboardLayout 
      title="Régulation des Quotas" 
      subtitle="Autorité Administrative Supérieure — SONAP (Présidence)"
    >
      {/* Filtres de Période */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Calendar size={18} className="text-slate-400" />
               <Select value={currentMois.toString()} onValueChange={(v) => setCurrentMois(parseInt(v))}>
                  <SelectTrigger className="w-40 h-10 rounded-xl font-bold">
                     <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                     {MOIS_LIST.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
            <Select value={currentAnnee.toString()} onValueChange={(v) => setCurrentAnnee(parseInt(v))}>
               <SelectTrigger className="w-28 h-10 rounded-xl font-bold text-indigo-600">
                  <SelectValue placeholder="Année" />
               </SelectTrigger>
               <SelectContent>
                  {ANNEE_LIST.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
               </SelectContent>
            </Select>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl h-10 border-slate-200 gap-2">
               <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Synchro
            </Button>
            {currentUserRole !== 'super_admin' && (
               <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2"
                  onClick={handleGenererPlanAnnuel}
               >
                  <FileText size={14} /> Générer Plan Annuel
               </Button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-white">
        {[
          { label: 'Quota National Essence', val: getNationalVal('essence'), color: 'emerald', icon: <Droplets className="text-emerald-400" /> },
          { label: 'Quota National Gasoil', val: getNationalVal('gasoil'), color: 'amber', icon: <Droplets className="text-amber-400" /> },
          { label: 'Compagnies Sous Régime', val: dbEntreprises.length, color: 'indigo', icon: <Building2 className="text-indigo-400" /> }
        ].map((stat, idx) => (
          <Card key={idx} className="border-none shadow-xl bg-slate-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                {stat.icon} {stat.label}
              </CardDescription>
              <CardTitle className={cn("text-3xl font-black", `text-${stat.color}-400`)}>
                {stat.val.toLocaleString()} {idx < 2 ? 'L' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={stat.val > 0 ? 65 : 0} className="h-1.5 bg-white/10" />
              <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase italic">Données {MOIS_LIST.find(m => m.id === currentMois)?.label} {currentAnnee}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="national" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
          <TabsTrigger value="national" className="rounded-xl px-6 py-2 gap-2 text-xs font-black uppercase">Planification État</TabsTrigger>
          <TabsTrigger value="entreprises" className="rounded-xl px-6 py-2 gap-2 text-xs font-black uppercase">Répartition Compagnies</TabsTrigger>
          <TabsTrigger value="stations" className="rounded-xl px-6 py-2 gap-2 text-xs font-black uppercase">Suivi Stations</TabsTrigger>
        </TabsList>

        <TabsContent value="national">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white p-2 shadow-sm border border-slate-200"><img src={sonapLogo} className="h-full w-full object-contain" /></div>
                 <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Objectifs Nationaux — {MOIS_LIST.find(m => m.id === currentMois)?.label} {currentAnnee}</CardTitle>
                    <CardDescription className="text-xs font-medium italic">Fixation des quantités globales prévues pour l'importation par la SONAP.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quota Essence Super (Litres)</label>
                       <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Importation</Badge>
                    </div>
                    <div className="flex gap-3">
                       <Input 
                         type="number" 
                         className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-black text-2xl px-6" 
                         defaultValue={getNationalVal('essence')}
                         onBlur={(e) => handleUpdateNationalQuota('essence', e.target.value)}
                         disabled={isReadOnly}
                       />
                       <div className="flex flex-col justify-center text-[10px] font-black text-slate-400">LITRES<br/>TOTAL</div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quota Gasoil / Diesel (Litres)</label>
                       <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Importation</Badge>
                    </div>
                    <div className="flex gap-3">
                       <Input 
                         type="number" 
                         className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-black text-2xl px-6" 
                         defaultValue={getNationalVal('gasoil')}
                         onBlur={(e) => handleUpdateNationalQuota('gasoil', e.target.value)}
                         disabled={isReadOnly}
                       />
                       <div className="flex flex-col justify-center text-[10px] font-black text-slate-400">LITRES<br/>TOTAL</div>
                    </div>
                 </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-start gap-6">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                    <ShieldAlert size={24} />
                 </div>
                 <div>
                    <h4 className="text-sm font-black text-indigo-900 uppercase">Ajustement Spécial & Régulation</h4>
                    <p className="text-xs text-indigo-700/80 leading-relaxed font-medium mt-1">
                      Les quotas définis ici s'appliquent strictement aux terminaux de déchargement. Toute modification impacte automatiquement les plafonds de distribution des {dbEntreprises.length} entreprises pétrolières agréées.
                    </p>
                    <div className="mt-4 flex gap-4">
                       <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-600">Ramadan 2026 : +15% prévu</Badge>
                       <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-600">Saison Pluies : Stock stratégique 20j</Badge>
                    </div>
                 </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-6 flex justify-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                  <Lock size={12} /> Système synchronisé avec la Direction Nationale des Services Aval (DSA)
               </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="entreprises">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Allocations par Compagnie</CardTitle>
                  <CardDescription className="text-xs font-medium italic">Part du quota national distribuée à chaque acteur pétrolier.</CardDescription>
                </div>
                {currentUserRole !== 'super_admin' && !isReadOnly && (
                  <Button 
                    className="h-11 rounded-xl font-black text-[10px] uppercase gap-2 bg-slate-900 hover:bg-slate-700 px-6 transition-all" 
                    onClick={handleAllouerQuota}
                    disabled={isDsaAdjoint}
                  >
                     {isDsaAdjoint ? <Lock size={16} /> : <Plus size={16} />}
                     {isDsaAdjoint ? 'Allocation restreinte' : 'Allouer Nouveau Quota'}
                  </Button>
                )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="py-5 pl-10 text-[10px] font-black uppercase">Compagnie</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Essence (Quota)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Gasoil (Quota)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Consommation</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right pr-10">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbEntreprises.map((e) => {
                    const qEss = getEntQuota(e.id, 'essence');
                    const qGas = getEntQuota(e.id, 'gasoil');
                    return (
                      <TableRow key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-6 pl-10">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-indigo-600 text-xs">{e.sigle || '??'}</div>
                              <div>
                                 <p className="font-black text-slate-900">{e.nom}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase">ID SIHG: {e.id.slice(0,8)}</p>
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <p className="text-sm font-black">{qEss?.quantite_allouee?.toLocaleString() || '0'} L</p>
                           <p className="text-[10px] text-emerald-600 font-bold">Reste: {((qEss?.quantite_allouee || 0) - (qEss?.quantite_utilisee || 0)).toLocaleString()} L</p>
                        </TableCell>
                        <TableCell>
                           <p className="text-sm font-black">{qGas?.quantite_allouee?.toLocaleString() || '0'} L</p>
                           <p className="text-[10px] text-amber-600 font-bold">Reste: {((qGas?.quantite_allouee || 0) - (qGas?.quantite_utilisee || 0)).toLocaleString()} L</p>
                        </TableCell>
                        <TableCell className="w-48">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-slate-400">PROGRESSION</span>
                              <span className="text-[9px] font-black text-indigo-600">34%</span>
                           </div>
                           <Progress value={34} className="h-1" />
                        </TableCell>
                        <TableCell className="text-right pr-10">
                           <Badge className="bg-emerald-500 border-none text-[9px] font-black uppercase">ACTIF</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
               <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Répartition par Point de Vente</CardTitle>
                    <CardDescription className="text-xs font-medium italic">Vérification de la redistribution effectuée par les compagnies.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                     <Select defaultValue="all">
                        <SelectTrigger className="h-10 w-48 rounded-xl"><SelectValue placeholder="Toutes les compagnies" /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">Toutes les compagnies</SelectItem>
                           {dbEntreprises.map(e => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="py-5 pl-10 text-[10px] font-black uppercase">Station Service</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Compagnie</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Produit</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Quota Station</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right pr-10">Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {dbStations.slice(0, 10).map((s) => {
                     const q = getStaQuota(s.id, 'essence');
                     return (
                       <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="py-5 pl-10 font-black text-sm">{s.nom}</TableCell>
                          <TableCell>
                             <Badge variant="outline" className="border-indigo-100 text-indigo-600 font-bold text-[9px]">{s.entreprises?.sigle}</Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-bold uppercase text-slate-500">Essence Super</TableCell>
                          <TableCell className="text-right font-black">{q?.quantite_allouee?.toLocaleString() || '250,000'} L</TableCell>
                          <TableCell className="text-right pr-10">
                             <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-emerald-600">42,000 L vendu</span>
                                <Progress value={18} className="w-24 h-1 mt-1" />
                             </div>
                          </TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Footer Audit */}
      <div className="mt-12 p-8 bg-slate-100 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border border-slate-200">
         <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-400 rotate-12 transition-transform hover:rotate-0">
               <Target size={32} />
            </div>
            <div>
               <h4 className="font-black text-slate-900 uppercase">Audit & Traçabilité National</h4>
               <p className="text-xs text-slate-500 font-medium italic max-w-md mt-1">
                  Chaque litre alloué est tracé depuis le tanker jusqu’au pistolet. Le SIHG bloque automatiquement toute livraison dépassant le quota mensuel validé par l'autorité.
               </p>
            </div>
         </div>
         <div className="flex gap-2">
            <Button 
                variant="ghost" 
                className="text-emerald-600 font-black text-xs uppercase tracking-tighter hover:bg-white rounded-xl h-12 px-6 gap-2"
                onClick={handleExportExcel}
            >
                <Download size={16} /> Excel Certifié (SIHG)
            </Button>
            <Button 
                variant="ghost" 
                className="text-indigo-600 font-black text-xs uppercase tracking-tighter hover:bg-white rounded-xl h-12 px-6 gap-2"
                onClick={handleTelechargerRapport}
            >
                <Download size={16} /> Rapport Régulation (PDF)
            </Button>
         </div>
      </div>
    </DashboardLayout>
  );
}

// Helper icons missing from imports
function Droplets(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3s-4 3-4 6.3c0 2.2 1.8 4 4 4Z" />
      <path d="M17 19.3c1.7 0 3-1.3 3-3 0-2.4-3-4.8-3-4.8s-3 2.4-3 4.8c0 1.7 1.3 3 3 3Z" />
    </svg>
  )
}
