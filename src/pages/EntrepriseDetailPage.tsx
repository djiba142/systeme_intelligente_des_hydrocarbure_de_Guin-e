import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Fuel,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StockBadge } from '@/components/dashboard/StockIndicator';
import { StockEvolutionChart } from '@/components/charts/StockEvolutionChart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Entreprise, Station, Alert } from '@/types';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

// Import logos
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

const getStockPercentage = (current: number, capacity: number) => {
  if (capacity <= 0) return 0;
  return Math.round((current / capacity) * 100);
};

const getStockLevel = (current: number, capacity: number) => {
  if (capacity <= 0) return 'healthy';
  const percentage = (current / capacity) * 100;
  if (percentage <= 15) return 'critical';
  if (percentage <= 30) return 'warning';
  if (percentage >= 85) return 'full';
  return 'healthy';
};

const statusStyles: Record<string, string> = {
  actif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspendu: 'bg-amber-100 text-amber-700 border-amber-200',
  ferme: 'bg-red-100 text-red-700 border-red-200',
  attente_dsa: 'bg-blue-100 text-blue-700 border-blue-200',
  attente_dla: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  attente_djc: 'bg-purple-100 text-purple-700 border-purple-200',
  attente_dsi: 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

const statusLabels: Record<string, string> = {
  actif: 'Actif',
  suspendu: 'Suspendu',
  ferme: 'Fermé',
  attente_dsa: 'Attente DSA',
  attente_dla: 'Attente DLA',
  attente_djc: 'Attente DJC',
  attente_dsi: 'Attente DSI'
};

const stationStatusStyles: Record<string, string> = {
  ouverte: 'bg-emerald-100 text-emerald-700',
  fermee: 'bg-red-100 text-red-700',
  en_travaux: 'bg-amber-100 text-amber-700',
  attente_validation: 'bg-blue-100 text-blue-700'
};

const stationStatusLabels: Record<string, string> = {
  ouverte: 'Ouverte',
  fermee: 'Fermée',
  en_travaux: 'En travaux',
  attente_validation: 'En attente'
};

export default function EntrepriseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canManageEntreprises, role: currentUserRole } = useAuth();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: entData, error: entErr } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (entErr) throw entErr;
        if (!entData) {
          setEntreprise(null);
          setLoading(false);
          return;
        }

        setEntreprise({
          id: entData.id,
          nom: entData.nom,
          sigle: entData.sigle,
          type: entData.type as 'compagnie' | 'distributeur',
          numeroAgrement: entData.numero_agrement,
          region: entData.region,
          statut: entData.statut as 'actif' | 'suspendu' | 'ferme',
          nombreStations: 0,
          logo: entData.logo_url || (entData.sigle && {
            'TOTAL': logoTotal,
            'TotalEnergies': logoTotal,
            'TO': logoTotal,
            'SHELL': logoShell,
            'VIVO': logoShell,
            'SH': logoShell,
            'TMI': logoTMI,
            'TM': logoTMI,
            'KP': logoKP,
          }[entData.sigle]) || undefined,
          contact: {
            nom: entData.contact_nom || 'N/A',
            telephone: entData.contact_telephone || '',
            email: entData.contact_email || '',
          },
          quota_essence: (entData as any).quota_essence || 0,
          quota_gasoil: (entData as any).quota_gasoil || 0,
        } as any);

        const { data: stData, error: stErr } = await supabase
          .from('stations')
          .select('*, entreprises:entreprise_id(nom, sigle, logo_url)')
          .eq('entreprise_id', id);

        if (stErr) throw stErr;

        setStations((stData || []).map(s => ({
          id: s.id,
          nom: s.nom,
          code: s.code,
          adresse: s.adresse,
          ville: s.ville,
          region: s.region,
          type: s.type as 'urbaine' | 'routiere' | 'depot',
          entrepriseId: s.entreprise_id,
          entrepriseNom: entData.nom,
          capacite: {
            essence: s.capacite_essence,
            gasoil: s.capacite_gasoil,
            gpl: s.capacite_gpl,
            lubrifiants: s.capacite_lubrifiants,
          },
          stockActuel: {
            essence: s.stock_essence,
            gasoil: s.stock_gasoil,
            gpl: s.stock_gpl,
            lubrifiants: s.stock_lubrifiants,
          },
          nombrePompes: s.nombre_pompes,
          gestionnaire: {
            nom: s.gestionnaire_nom || 'Non assigné',
            telephone: s.gestionnaire_telephone || '',
            email: s.gestionnaire_email || '',
          },
          statut: s.statut as 'ouverte' | 'fermee' | 'en_travaux' | 'attente_validation',
        })));

        const { data: alertData, error: alertErr } = await supabase
          .from('alertes')
          .select('*, station:stations(nom)')
          .eq('entreprise_id', id)
          .eq('resolu', false);

        if (alertErr) throw alertErr;

        setAlerts((alertData || []).map(a => ({
          id: a.id,
          type: a.type as any,
          stationId: a.station_id || '',
          stationNom: (a as any).station?.nom || 'Station',
          entrepriseNom: entData.nom,
          message: a.message,
          niveau: a.niveau as 'critique' | 'alerte',
          dateCreation: a.created_at,
          resolu: a.resolu,
        })));
      } catch (e) {
        console.error(e);
        setEntreprise(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout title="Chargement...">
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4 opacity-20" />
          <p>Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!entreprise) {
    return (
      <DashboardLayout title="Entreprise non trouvée">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cette entreprise n'existe pas.</p>
          <Link to="/entreprises">
            <Button className="mt-4">Retour aux entreprises</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Calculs agrégés
  const totalCapacity = {
    essence: stations.reduce((sum, s) => sum + s.capacite.essence, 0),
    gasoil: stations.reduce((sum, s) => sum + s.capacite.gasoil, 0),
  };

  const totalStock = {
    essence: stations.reduce((sum, s) => sum + s.stockActuel.essence, 0),
    gasoil: stations.reduce((sum, s) => sum + s.stockActuel.gasoil, 0),
  };

  const essencePercentage = getStockPercentage(totalStock.essence, totalCapacity.essence);
  const gasoilPercentage = getStockPercentage(totalStock.gasoil, totalCapacity.gasoil);

  const stationsOuvertes = stations.filter(s => s.statut === 'ouverte').length;
  const alertesCritiques = alerts.filter(a => a.niveau === 'critique').length;

  return (
    <DashboardLayout
      title={entreprise.nom}
      subtitle={`${entreprise.type === 'compagnie' ? 'Compagnie' : 'Distributeur'} - ${entreprise.region}`}
    >
      {/* Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/entreprises" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors no-underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </Link>
        {canManageEntreprises && (
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="rounded-xl border-dashed" onClick={() => setIsEditDialogOpen(true)}>Modifier Infos</Button>
             {(['admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution'].includes(currentUserRole || '')) && (
               <Button variant="outline" size="sm" className="rounded-xl border-dashed">Modifier Quotas</Button>
             )}
             <Button variant="outline" size="sm" className="rounded-xl">Historique Quotas</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info & Contact */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center border border-border overflow-hidden">
                  {entreprise.logo ? (
                    <img
                      src={entreprise.logo}
                      alt={`Logo ${entreprise.sigle}`}
                      className="h-14 w-14 object-contain"
                      onError={e => (e.currentTarget.src = '/placeholder-logo.png')}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {entreprise.sigle.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">{entreprise.sigle}</CardTitle>
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border mt-1",
                    statusStyles[entreprise.statut]
                  )}>
                    {statusLabels[entreprise.statut]}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>N° Agrément: <strong>{entreprise.numeroAgrement}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{entreprise.region}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{entreprise.contact.nom}</p>
                <p className="text-sm text-muted-foreground">Responsable</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${entreprise.contact.telephone}`} className="hover:text-primary no-underline">
                  {entreprise.contact.telephone}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${entreprise.contact.email}`} className="hover:text-primary no-underline">
                  {entreprise.contact.email}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistiques Globales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <Fuel className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{stations.length}</p>
                  <p className="text-xs text-muted-foreground">Stations</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-stock-healthy mb-1" />
                  <p className="text-2xl font-bold">{stationsOuvertes}</p>
                  <p className="text-xs text-muted-foreground">Ouvertes</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <AlertTriangle className="h-5 w-5 mx-auto text-stock-critical mb-1" />
                  <p className="text-2xl font-bold">{alertesCritiques}</p>
                  <p className="text-xs text-muted-foreground">Alertes</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{stations.filter(s => s.statut === 'attente_validation').length}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Quotas Status */}
          <Card className="border-none shadow-sm bg-slate-900 text-white rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-400">Suivi des Quotas Mensuels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                  <span className="text-emerald-400">Essence</span>
                  <span>{(entreprise as any).quota_essence?.toLocaleString()} L</span>
                </div>
                <Progress value={35} className="h-1.5 bg-white/10" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                  <span className="text-blue-400">Gasoil</span>
                  <span>{(entreprise as any).quota_gasoil?.toLocaleString()} L</span>
                </div>
                <Progress value={20} className="h-1.5 bg-white/10" />
              </div>
              <p className="text-[9px] text-slate-500 font-bold italic">Données synchronisées avec SONAP</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stations & Stock */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Global de l'Entreprise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Essence Super</span>
                    <StockBadge percentage={essencePercentage} />
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getStockLevel(totalStock.essence, totalCapacity.essence) === 'critical' && "bg-stock-critical",
                        getStockLevel(totalStock.essence, totalCapacity.essence) === 'warning' && "bg-stock-warning",
                        getStockLevel(totalStock.essence, totalCapacity.essence) === 'healthy' && "bg-stock-healthy",
                        getStockLevel(totalStock.essence, totalCapacity.essence) === 'full' && "bg-stock-full"
                      )}
                      style={{ width: `${Math.min(essencePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalStock.essence.toLocaleString()} / {totalCapacity.essence.toLocaleString()} L
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Gasoil</span>
                    <StockBadge percentage={gasoilPercentage} />
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getStockLevel(totalStock.gasoil, totalCapacity.gasoil) === 'critical' && "bg-stock-critical",
                        getStockLevel(totalStock.gasoil, totalCapacity.gasoil) === 'warning' && "bg-stock-warning",
                        getStockLevel(totalStock.gasoil, totalCapacity.gasoil) === 'healthy' && "bg-stock-healthy",
                        getStockLevel(totalStock.gasoil, totalCapacity.gasoil) === 'full' && "bg-stock-full"
                      )}
                      style={{ width: `${Math.min(gasoilPercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalStock.gasoil.toLocaleString()} / {totalCapacity.gasoil.toLocaleString()} L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Evolution Chart */}
          <StockEvolutionChart
            entrepriseId={id}
            title="Évolution des stocks de l'entreprise"
          />

          {/* Stations List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Stations ({stations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stations.map(station => {
                  const essencePercent = getStockPercentage(station.stockActuel.essence, station.capacite.essence);
                  const gasoilPercent = getStockPercentage(station.stockActuel.gasoil, station.capacite.gasoil);
                  const essenceLevel = getStockLevel(station.stockActuel.essence, station.capacite.essence);
                  const gasoilLevel = getStockLevel(station.stockActuel.gasoil, station.capacite.gasoil);
                  const worstLevel = essenceLevel === 'critical' || gasoilLevel === 'critical'
                    ? 'critical'
                    : essenceLevel === 'warning' || gasoilLevel === 'warning'
                      ? 'warning'
                      : 'healthy';

                  return (
                    <Link
                      key={station.id}
                      to={`/stations/${station.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          worstLevel === 'critical' && "bg-destructive/10",
                          worstLevel === 'warning' && "bg-amber-100",
                          worstLevel === 'healthy' && "bg-emerald-100"
                        )}>
                          <Fuel className={cn(
                            "h-5 w-5",
                            worstLevel === 'critical' && "text-stock-critical",
                            worstLevel === 'warning' && "text-stock-warning",
                            worstLevel === 'healthy' && "text-stock-healthy"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium group-hover:text-primary transition-colors">
                              {station.nom}
                            </h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium",
                              stationStatusStyles[station.statut]
                            )}>
                              {stationStatusLabels[station.statut]}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{station.ville} • {station.code}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Essence:</span>
                            <StockBadge percentage={essencePercent} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Gasoil:</span>
                            <StockBadge percentage={gasoilPercent} size="sm" />
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  );
                })}

                {stations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fuel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune station enregistrée</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <Card className="border-stock-critical/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-stock-critical" />
                  Alertes Actives ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        alert.niveau === 'critique'
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{alert.stationNom}</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          alert.niveau === 'critique'
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {alert.niveau === 'critique' ? 'Critique' : 'Alerte'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}