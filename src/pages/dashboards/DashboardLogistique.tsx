import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Warehouse, Package, Truck, Activity, Droplets, ArrowRight,
  TrendingUp, AlertTriangle, Plus, Search, MapPin, FileText,
  Navigation, ClipboardCheck, Clock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { OrdreRavitaillementDialog } from '@/components/dashboard/OrdreRavitaillementDialog';

export default function DashboardLogistique() {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRavitaillementOpen, setIsRavitaillementOpen] = useState(false);
  const isLogManager = role === 'directeur_logistique' || role === 'super_admin';
  const isLogOp = role === 'agent_logistique' || role === 'responsable_depots' || role === 'responsable_transport' || role === 'operateur_logistique';
  const isGuest = !['directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique', 'super_admin'].includes(role || '');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['logistique-dashboard-stats'],
    queryFn: async () => {
      const { data: allStocks } = await (supabase as any).from('logistique_stocks').select('*, produit:import_produits(nom)');
      const { data: depots } = await (supabase as any).from('logistique_depots').select('*');
      const { count: receptions } = await (supabase as any).from('logistique_receptions').select('*', { count: 'exact', head: true });
      const { data: distribution } = await (supabase as any).from('livraisons').select('*, station:stations(nom)').eq('statut', 'en_cours').limit(5);
      const { data: incoming } = await (supabase as any).from('import_dossiers').select('*').in('statut', ['arrive_conakry', 'receptionne']).limit(3);
      const { data: demandes_dsa } = await (supabase as any).from('ordres_livraison').select('*, station:stations(nom, code)').eq('statut', 'en_attente').order('created_at', { ascending: false }).limit(4);
      
      const totalStock = allStocks?.reduce((acc: number, s: any) => acc + Number(s.quantite_disponible), 0) || 0;
      const depotCount = depots?.length || 0;

      return { totalStock, depotCount, receptions, incoming, depots, allStocks, distribution, demandes_dsa };
    }
  });

  const handleConfirmArrival = async (dossierId: string) => {
    try {
      const { error } = await (supabase as any).from('import_dossiers').update({ statut: 'receptionne' }).eq('id', dossierId);
      if (error) throw error;
      toast({ title: "Réception Enregistrée", description: "Carburant transféré virtuellement vers vos dépôts stratégiques." });
      window.location.reload();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la réception." });
    }
  };

  const handleDispatchTruck = async (orderId: string, qty: number, stationId: string, produit: string) => {
    try {
      const { error: updErr } = await (supabase as any).from('ordres_livraison').update({ statut: 'approuve' }).eq('id', orderId);
      if (updErr) throw updErr;

      // Mocking a livraison injection
      const { error: insErr } = await (supabase as any).from('livraisons').insert({
        station_id: stationId,
        quantite_prevue: qty,
        statut: 'en_cours',
        produit: produit || 'Gasoil',
        camion_plaque: 'RC-' + Math.floor(1000 + Math.random() * 9000),
        date_depart: new Date().toISOString()
      });
      if (insErr) console.warn("Livraison insert skipped or failed", insErr);

      toast({ title: "Camion Expédié", description: "Le DSA a été notifié de l'approche du camion." });
      window.location.reload();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Erreur lors de l'expédition." });
    }
  };

  return (
    <DashboardLayout 
      title="Direction Logistique" 
      subtitle="Supervision du transport national, gestion des dépôts pétroliers et des stocks stratégiques."
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Stock National Total" 
            value={`${((stats?.totalStock || 0) / 1000).toFixed(1)}k MT`} 
            icon={Droplets} 
            trend="Couverture: 45 jours" 
            color="indigo"
          />
          <StatCard 
            title="Taux d'Occupation" 
            value="72%" 
            icon={Warehouse} 
            trend="Capacité résiduelle: 28%" 
            color="emerald"
          />
          <StatCard 
            title="Dépôts Actifs" 
            value={stats?.depotCount || 0} 
            icon={MapPin} 
            trend="Surveillance temps réel" 
            color="blue"
          />
          <StatCard 
            title="Réceptions (Mois)" 
            value={stats?.receptions || 0} 
            icon={Package} 
            trend="+12% vs mois dernier" 
            color="amber"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Stock Table */}
          <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    État des Stocks par Dépôt
                  </CardTitle>
                  <CardDescription className="text-slate-400">Volumes réels consolidés depuis les réceptions portuaires.</CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isGuest && (
                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" onClick={() => navigate('/logistique/planning')}>
                      Planning Distribution
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                    <Link to="/rapports">Rapports</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Nom du Dépôt</th>
                      <th className="px-6 py-4">Produits & Volumes (MT)</th>
                      <th className="px-6 py-4">Capacité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats?.depots?.map((depot: any) => {
                      const depotStocks = stats?.allStocks?.filter((s: any) => s.depot_id === depot.id) || [];
                      const totalUsed = depotStocks.reduce((acc: number, s: any) => acc + Number(s.quantite_disponible), 0);
                      const usagePercent = Math.round((totalUsed / (depot.capacite_totale || 1)) * 100);
                      
                      return (
                        <tr key={depot.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{depot.nom}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {depot.localisation}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {depotStocks.length > 0 ? depotStocks.map((s: any) => (
                                <Badge key={s.id} variant="outline" className="bg-white text-[10px] font-bold uppercase border-slate-200">
                                  {s.produit?.nom}: {Number(s.quantite_disponible).toLocaleString()}
                                </Badge>
                              )) : <span className="text-xs text-slate-400 italic">Aucun stock</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-40 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-slate-500">{totalUsed.toLocaleString()} / {depot.capacite_totale?.toLocaleString()} MT</span>
                                <span className={cn(usagePercent > 85 ? "text-red-600" : "text-emerald-600")}>{usagePercent}%</span>
                              </div>
                              <Progress value={usagePercent} className={cn("h-1.5", usagePercent > 85 ? "bg-red-100" : "bg-emerald-100")} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="lg:col-span-4 space-y-6">

            {/* Demandes DSA Monitor */}
            <Card className="border-emerald-200 shadow-lg bg-emerald-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                  <Activity className="h-4 w-4" />
                  Demandes Stations (DSA)
                </CardTitle>
                <CardDescription className="text-xs">Ordres de Ravitaillement en attente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.demandes_dsa && stats.demandes_dsa.length > 0 ? (
                  stats.demandes_dsa.map((order: any) => (
                    <div key={order.id} className="p-3 rounded-xl bg-white shadow-sm border border-emerald-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{order.station?.nom || 'Station SGP'}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{order.carburant || 'Produit'} — {Number(order.quantite_demandee || 0).toLocaleString()} L</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase font-black text-amber-600 bg-amber-50 border-amber-200">En attente</Badge>
                      </div>
                      <Button onClick={() => handleDispatchTruck(order.id, order.quantite_demandee, order.station_id, order.carburant)} className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        <Truck className="h-3.5 w-3.5 mr-2" />
                        EXPÉDIER CAMION
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">Aucune demande en attente.</p>
                )}
              </CardContent>
            </Card>

            {/* Navires Importation Monitor */}
            <Card className="border-indigo-200 shadow-lg bg-indigo-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-800">
                  <Warehouse className="h-4 w-4" />
                  Arrivages Navires (Port)
                </CardTitle>
                <CardDescription className="text-xs">Transfert Importation → Dépôt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.incoming && stats.incoming.length > 0 ? (
                  stats.incoming.map((ship: any) => (
                    <div key={ship.id} className="p-3 rounded-xl bg-white shadow-sm border border-indigo-100 flex flex-col justify-between">
                      <div className="mb-2">
                        <p className="text-xs font-bold text-slate-800 uppercase">{ship.navire_nom || 'Navire Standard'} <span className="text-slate-400 font-normal">({ship.numero_dossier})</span></p>
                        <p className="text-[10px] text-slate-500 font-bold">{ship.carburant || 'Produit Mixte'} — {Number(ship.quantite_prevue || 0).toLocaleString()} TM</p>
                      </div>
                      <Button 
                        disabled={ship.statut === 'receptionne'}
                        variant={ship.statut === 'receptionne' ? 'outline' : 'default'}
                        onClick={() => handleConfirmArrival(ship.id)} 
                        className={cn("w-full h-8 text-xs font-bold shadow-sm", ship.statut === 'receptionne' ? 'text-indigo-400 border-indigo-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white')}
                      >
                        {ship.statut === 'receptionne' ? <ClipboardCheck className="h-3.5 w-3.5 mr-2" /> : <Package className="h-3.5 w-3.5 mr-2" />}
                        {ship.statut === 'receptionne' ? 'Transféré au Dépôt' : 'RÉCEPTIONNER AU DÉPÔT'}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">Aucun navire à quai.</p>
                )}
              </CardContent>
            </Card>

            {/* Distribution Monitor */}
            <Card className="border-none shadow-lg bg-blue-50 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
                  <Navigation className="h-5 w-5" />
                  Distribution en cours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.distribution && stats.distribution.length > 0 ? (
                  stats.distribution.map((item: any) => (
                    <div key={item.id} className="p-3 rounded-xl bg-white shadow-sm border border-blue-100 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-blue-600">{item.produit}</p>
                        <h4 className="text-xs font-bold text-slate-900 truncate">Vers {item.station?.nom}</h4>
                        <p className="text-[9px] text-slate-400 font-medium">{item.camion_plaque}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-900">{item.quantite_prevue?.toLocaleString()} L</p>
                        <Badge className="bg-blue-50 text-blue-600 text-[8px] h-4">EN ROUTE</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">Aucun camion en route.</p>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full text-xs font-black uppercase text-blue-600 hover:bg-blue-100/50" 
                  onClick={() => navigate('/logistique/planning')}
                >
                  Gérer la distribution
                </Button>
              </CardContent>
            </Card>

            {/* Actions Panel */}
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opérations Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLogManager && (
                  <>
                    <ActionButton 
                      icon={Plus} 
                      label="Nouvelle Réception Port" 
                      onClick={() => navigate('/logistique/receptions')}
                    />
                    <ActionButton 
                      icon={Truck} 
                      label="Planifier un Transfert" 
                      onClick={() => navigate('/logistique/transport')}
                    />
                    <ActionButton 
                      icon={ClipboardCheck} 
                      label="Inventaire Dépôt" 
                      onClick={() => navigate('/logistique/depots')}
                    />
                  </>
                )}
                <div className="pt-4">
                  {(isLogManager || role === 'directeur_aval') && (
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase h-12 rounded-xl gap-2 shadow-lg shadow-red-200"
                      onClick={() => setIsRavitaillementOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Déclencher Ravitaillement
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <OrdreRavitaillementDialog 
        open={isRavitaillementOpen} 
        onOpenChange={setIsRavitaillementOpen}
        onSuccess={() => {
          toast({ title: "Ordre logistique transmis", description: "L'instruction de ravitaillement a été injectée dans le flux." });
        }}
      />
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110", colors[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-[10px] font-bold uppercase">{trend}</Badge>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start gap-3 h-12 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/5 group"
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
    </Button>
  );
}
