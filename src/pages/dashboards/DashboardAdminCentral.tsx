import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Building2, Fuel, AlertTriangle, RefreshCw, TrendingUp,
  ShieldCheck, Ship, CheckCircle2, Clock, ChevronRight,
  BarChart3, FileText, Download, ShieldAlert, Scale,
  Landmark, ScrollText, Award, Gauge, Users, Search, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateEntrepriseDialog } from '../../components/dashboard/CreateEntrepriseDialog';
import { CreateStationDialog } from '../../components/dashboard/CreateStationDialog';

export default function DashboardAdminCentral() {
  const { role } = useAuth();
  const [stats, setStats] = useState({
    totalEntreprises: 0,
    totalStations: 0,
    alertesCritiques: 0,
    importationsActives: 0,
    quotasEnAttente: 0,
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [pendingQuotas, setPendingQuotas] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [dossiersSIHG, setDossiersSIHG] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateEntrepriseOpen, setIsCreateEntrepriseOpen] = useState(false);
  const [isCreateStationOpen, setIsCreateStationOpen] = useState(false);

  const CONSOMMATION_JOURNALIERE = { essence: 800000, gasoil: 1200000 };

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
      const [resEntreprises, resStations, resAlerts, resImportations, resRawStations, resQuotas, resLogs, resDossiers] = await Promise.all([
        supabase.from('entreprises').select('*', { count: 'exact', head: true }),
        supabase.from('stations').select('*', { count: 'exact', head: true }),
        supabase.from('alertes').select('*').eq('resolu', false).order('created_at', { ascending: false }).limit(3),
        supabase.from('importations').select('*', { count: 'exact', head: true }).neq('statut', 'termine'),
        supabase.from('stations').select('*, entreprises(nom, sigle)'),
        (supabase as any).from('regulation_quotas').select('*, entreprises(nom, sigle)').in('statut', ['en_analyse', 'propose']).limit(3),
        (supabase as any).from('regulation_logs').select('*').order('created_at', { ascending: false }).limit(4),
        (supabase as any).from('dossiers_entreprise').select('*, entreprises(nom, sigle)').in('statut', ['avis_dg', 'approuve']).order('updated_at', { ascending: false })
      ]);

      setStats({
        totalEntreprises: resEntreprises.count || 0,
        totalStations: resStations.count || 0,
        alertesCritiques: resAlerts.data?.length || 0,
        importationsActives: resImportations.count || 0,
        quotasEnAttente: resQuotas.data?.length || 0,
      });

      setRecentAlerts(resAlerts.data || []);
      setPendingQuotas((resQuotas.data || []).map((q: any) => ({
        id: q.id,
        entreprise: q.entreprises?.nom || 'Inconnu',
        produit: q.produit,
        quantite: q.quantite,
        statut: q.statut,
        periode: q.periode,
        document_url: q.document_url
      })));
      setRecentActions((resLogs.data || []).map((l: any) => ({
        id: l.id,
        action: l.action,
        cible: l.details?.quota_id || l.details?.agrement_id || 'Action Système',
        auteur: 'Système',
        date: new Date(l.created_at).toLocaleDateString()
      })));
      setDossiersSIHG(resDossiers.data || []);

      const mappedStations: Station[] = (resRawStations.data || []).map((s: any) => ({
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
      console.error('Error fetching admin central data:', error);
      toast.error("Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDossierAction = async (dossierId: string, action: 'approuver' | 'rejeter') => {
    let nextStatut = action === 'approuver' ? 'approuve' : 'rejete';

    try {
      const { error } = await (supabase as any)
        .from('dossiers_entreprise')
        .update({ statut: nextStatut })
        .eq('id', dossierId);

      if (error) throw error;
      toast.success(`Dossier mis à jour : ${nextStatut}`);
      fetchData();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour du dossier");
    }
  };

  const roleLabel = useMemo(() => {
    if (role === 'admin_central') return 'Administrateur Central';
    if (role === 'chef_regulation') return 'Chef Service Régulation';
    if (role === 'analyste_regulation') return 'Analyste Régulation';
    if (role === 'super_admin') return 'Super Administrateur';
    return 'Régulation';
  }, [role]);

  const isAdmin = role === 'admin_central' || role === 'super_admin';

  return (
    <DashboardLayout
      title={`Régulation — ${roleLabel}`}
      subtitle="SONAP — État de Guinée"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <Landmark className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              Pilotage {roleLabel}
            </h2>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm mr-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-9 rounded-xl bg-white shadow-sm hover:bg-slate-50 border border-slate-200"
                onClick={() => setIsCreateEntrepriseOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4 text-indigo-600" />
                Nouvelle Entreprise
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-9 rounded-xl bg-white shadow-sm hover:bg-slate-50 border border-slate-200"
                onClick={() => setIsCreateStationOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4 text-emerald-600" />
                Nouvelle Station
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-11 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:shadow-sm">Vue d'Ensemble</TabsTrigger>
                <TabsTrigger value="dossiers" className="rounded-lg data-[state=active]:shadow-sm">Dossiers</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-11 w-11 p-0 rounded-xl border-slate-200">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} className="mt-0">
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Compagnies Agréées" value={stats.totalEntreprises} subtitle="Entreprises" icon={Building2} />
            <StatCard title="Parc de Stations" value={stats.totalStations} subtitle="Stations" icon={Fuel} />
            <StatCard title="Quotas en Attente" value={stats.quotasEnAttente} subtitle="Validation" icon={Gauge} />
            <StatCard title="Alertes Critiques" value={stats.alertesCritiques} subtitle="Action requise" icon={AlertTriangle} variant="critical" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                  <NationalAutonomyGauge daysRemaining={autonomie.essence} fuelType="essence" />
              </div>
              <div>
                  <NationalAutonomyGauge daysRemaining={autonomie.gasoil} fuelType="gasoil" />
              </div>
          </div>
        </TabsContent>

        <TabsContent value="dossiers">
          <Card>
            <CardHeader>
              <CardTitle>Dossiers SIHG</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-4 px-4 font-bold">Référence</th>
                      <th className="text-left py-4 px-4 font-bold">Entreprise</th>
                      <th className="text-left py-4 px-4 font-bold">Statut</th>
                      <th className="text-right py-4 px-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersSIHG.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Aucun dossier</td></tr>
                    ) : (
                      dossiersSIHG.map((d) => (
                        <tr key={d.id} className="border-t border-slate-100">
                          <td className="py-4 px-4 font-medium">{d.numero_dossier}</td>
                          <td className="py-4 px-4">{d.entreprises?.sigle || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <Badge className={d.statut === 'approuve' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {d.statut === 'approuve' ? 'Approuvé' : 'Avis DG'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                                {d.statut === 'avis_dg' && (
                                    <Button size="sm" onClick={() => handleDossierAction(d.id, 'approuver')}>Accorder</Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleDossierAction(d.id, 'rejeter')}>Rejeter</Button>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link to={`/dossiers/${d.id}`}>Détails</Link>
                                </Button>
                            </div>
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
      </Tabs>
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
