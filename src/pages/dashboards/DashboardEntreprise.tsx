import { useEffect, useState, useCallback } from 'react';
import {
  Fuel,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  Phone,
  Mail,
  Clock,
  Plus,
  History,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StockBadge } from '@/components/dashboard/StockIndicator';
import { StockEvolutionChart } from '@/components/charts/StockEvolutionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { REGIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Station {
  id: string;
  nom: string;
  code: string;
  ville: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  type: string;
  capacite_essence: number;
  capacite_gasoil: number;
  stock_essence: number;
  stock_gasoil: number;
  nombre_pompes: number;
  statut: 'ouverte' | 'fermee' | 'en_travaux' | 'attente_validation';
}

interface Order {
  id: string;
  created_at: string;
  carburant: string;
  quantite_demandee: number;
  statut: string;
  station: { nom: string } | null;
}

interface Entreprise {
  id: string;
  nom: string;
  sigle: string;
  type: string;
  region: string;
  logo_url: string | null;
  contact_nom: string | null;
  contact_telephone: string | null;
  contact_email: string | null;
  numero_agrement: string | null;
  statut: string;
}

interface AlertItem {
  id: string;
  station_nom: string;
  message: string;
  niveau: 'critique' | 'alerte';
}

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

export default function DashboardEntreprise() {
  const { profile, user } = useAuth();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLivraisonDialogOpen, setIsLivraisonDialogOpen] = useState(false);
  const [isStationDialogOpen, setIsStationDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingStation, setSavingStation] = useState(false);
  const { toast } = useToast();

  const [newLivraison, setNewLivraison] = useState({
    station_id: '',
    carburant: '',
    quantite: '',
    bon_livraison: '',
  });

  const [stationForm, setStationForm] = useState({
    nom: '',
    code: '',
    adresse: '',
    ville: '',
    region: '',
    type: 'urbaine' as 'urbaine' | 'routiere' | 'depot',
    capacite_essence: 50000,
    capacite_gasoil: 50000,
    gestionnaire_nom: '',
    gestionnaire_telephone: '',
    gestionnaire_email: '',
  });

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    station_id: 'enterprise_stock', // Default to enterprise stock
    carburant: '',
    quantite: '',
    priorite: 'normale',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const entrepriseId = profile?.entreprise_id || '';
      if (!entrepriseId) {
        setLoading(false);
        return;
      }

      // Fetch ALL data in parallel in ONE round
      const [entrepriseRes, stationsRes, ordersRes, alertsRes] = await Promise.all([
        supabase
          .from('entreprises')
          .select('*')
          .eq('id', entrepriseId)
          .maybeSingle(),
        supabase
          .from('stations')
          .select('*')
          .eq('entreprise_id', entrepriseId)
          .order('nom'),
        supabase
          .from('ordres_livraison')
          .select('*, station:stations(nom)')
          .eq('entreprise_id', entrepriseId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('alertes')
          .select('*, station:stations(nom)')
          .eq('entreprise_id', entrepriseId)
          .eq('resolu', false)
          .limit(20),
      ]);

      if (entrepriseRes.error) throw entrepriseRes.error;
      setEntreprise(entrepriseRes.data);

      if (stationsRes.error) throw stationsRes.error;
      const stationsList = (stationsRes.data as any[]) || [];
      setStations(stationsList);

      setOrders(ordersRes.data || []);
      setAlerts((alertsRes.data || []).map(a => ({
        id: a.id,
        station_nom: (a as { station?: { nom: string } }).station?.nom || 'Station',
        message: a.message,
        niveau: a.niveau as 'critique' | 'alerte',
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.entreprise_id]);

  useEffect(() => {
    if (profile?.entreprise_id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [profile?.entreprise_id, fetchData]);

  const handleSubmitLivraison = async () => {
    if (!newLivraison.station_id || !newLivraison.carburant || !newLivraison.quantite) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedStation = stations.find(s => s.id === newLivraison.station_id);
      if (!selectedStation) throw new Error("Station non trouvée");

      const { error: livraisonError } = await supabase
        .from('livraisons')
        .insert({
          station_id: newLivraison.station_id,
          carburant: newLivraison.carburant,
          quantite: parseInt(newLivraison.quantite),
          bon_livraison: newLivraison.bon_livraison || null,
          created_by: user?.id,
          statut: 'confirme'
        });

      if (livraisonError) throw livraisonError;

      const stockField = `stock_${newLivraison.carburant}` as keyof typeof selectedStation;
      const currentStock = (selectedStation[stockField] as number) || 0;
      const { error: updateError } = await supabase
        .from('stations')
        .update({ [stockField]: currentStock + parseInt(newLivraison.quantite) })
        .eq('id', newLivraison.station_id);

      if (updateError) throw updateError;

      toast({
        title: "Livraison enregistrée",
        description: "Le stock a été mis à jour avec succès.",
      });

      setIsLivraisonDialogOpen(false);
      setNewLivraison({ station_id: '', carburant: '', quantite: '', bon_livraison: '' });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'enregistrer la livraison",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStation = async () => {
    if (!stationForm.nom?.trim() || !stationForm.code?.trim() || !stationForm.adresse?.trim() ||
      !stationForm.ville?.trim() || !stationForm.region || !profile?.entreprise_id) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires manquants',
        description: "Veuillez remplir le nom, le code, l'adresse, la ville et la région.",
      });
      return;
    }

    setSavingStation(true);
    try {
      const { error } = await supabase.from('stations').insert({
        nom: stationForm.nom.trim(),
        code: stationForm.code.trim().toUpperCase(),
        adresse: stationForm.adresse.trim(),
        ville: stationForm.ville.trim(),
        region: stationForm.region,
        type: stationForm.type,
        entreprise_id: profile.entreprise_id,
        capacite_essence: stationForm.capacite_essence || 0,
        capacite_gasoil: stationForm.capacite_gasoil || 0,
        statut: 'ouverte',
        gestionnaire_nom: stationForm.gestionnaire_nom.trim() || null,
        gestionnaire_telephone: stationForm.gestionnaire_telephone.trim() || null,
        gestionnaire_email: stationForm.gestionnaire_email.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Station créée',
        description: `${stationForm.nom} a été ajoutée avec succès.`,
      });
      setIsStationDialogOpen(false);
      setStationForm({
        nom: '', code: '', adresse: '', ville: '', region: '',
        type: 'urbaine', capacite_essence: 50000, capacite_gasoil: 50000,
        gestionnaire_nom: '', gestionnaire_telephone: '', gestionnaire_email: '',
      });
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'enregistrement",
        description: error.message || "Impossible d'enregistrer la station.",
      });
    } finally {
      setSavingStation(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.carburant || !orderForm.quantite) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le type de carburant et la quantité",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // station_id is required by the schema. If 'enterprise_stock', use first station.
      let targetStationId = orderForm.station_id;
      if (targetStationId === 'enterprise_stock') {
        if (stations.length === 0) {
          toast({
            title: "Erreur",
            description: "Vous devez d'abord créer une station pour passer une commande.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        targetStationId = stations[0].id;
      }

      const { error } = await supabase.from('ordres_livraison').insert({
        station_id: targetStationId,
        carburant: orderForm.carburant,
        quantite_demandee: parseInt(orderForm.quantite),
        priorite: orderForm.priorite,
        notes: orderForm.notes || null,
        created_by: user?.id || '',
        statut: 'en_attente'
      });

      if (error) throw error;

      toast({
        title: "Commande envoyée",
        description: "Votre commande a été transmise à la SONAP.",
      });
      setIsOrderDialogOpen(false);
      setOrderForm({
        station_id: 'enterprise_stock',
        carburant: '',
        quantite: '',
        priorite: 'normale',
        notes: '',
      });
      fetchData(); // Refresh orders list
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'envoyer la commande",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Computed stats
  const totalCapacity = {
    essence: stations.reduce((sum, s) => sum + (s.capacite_essence || 0), 0),
    gasoil: stations.reduce((sum, s) => sum + (s.capacite_gasoil || 0), 0),
  };

  const totalStock = {
    essence: stations.reduce((sum, s) => sum + (s.stock_essence || 0), 0),
    gasoil: stations.reduce((sum, s) => sum + (s.stock_gasoil || 0), 0),
  };

  const essencePercentage = getStockPercentage(totalStock.essence, totalCapacity.essence);
  const gasoilPercentage = getStockPercentage(totalStock.gasoil, totalCapacity.gasoil);

  const stationsOuvertes = stations.filter(s => s.statut === 'ouverte').length;
  const alertesCritiques = alerts.filter(a => a.niveau === 'critique').length;

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Entreprise" subtitle="Chargement...">
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4 opacity-20" />
          <p>Chargement des données...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!entreprise) {
    return (
      <DashboardLayout
        title="Dashboard Entreprise"
        subtitle="Aucune entreprise assignée"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune entreprise assignée</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Votre compte n'est pas encore lié à une entreprise.
              Veuillez contacter un administrateur pour être assigné à votre entreprise.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout
        title={entreprise.nom}
        subtitle={`${entreprise.type === 'compagnie' ? 'Compagnie' : 'Distributeur'} - ${entreprise.region}`}
      >
        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <Button className="gap-2" onClick={() => setIsLivraisonDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Ravitaillement
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsOrderDialogOpen(true)}>
            <Building2 className="h-4 w-4" />
            Commander du Stock (SONAP)
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsStationDialogOpen(true)}>
            <MapPin className="h-4 w-4" />
            Nouvelle Station
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info & Contact & Stats */}
          <div className="space-y-6">
            {/* Company Info */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center border border-border overflow-hidden">
                    {entreprise.logo_url ? (
                      <img
                        src={entreprise.logo_url}
                        alt={`Logo ${entreprise.sigle}`}
                        className="h-14 w-14 object-contain"
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
                      entreprise.statut === 'actif' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                      entreprise.statut === 'suspendu' && 'bg-amber-100 text-amber-700 border-amber-200',
                      entreprise.statut === 'ferme' && 'bg-red-100 text-red-700 border-red-200'
                    )}>
                      {entreprise.statut === 'actif' ? 'Actif' : entreprise.statut === 'suspendu' ? 'Suspendu' : 'Fermé'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {entreprise.numero_agrement && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>N° Agrément: <strong>{entreprise.numero_agrement}</strong></span>
                  </div>
                )}
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
                  <p className="font-medium">{entreprise.contact_nom || 'Non renseigné'}</p>
                  <p className="text-sm text-muted-foreground">Responsable</p>
                </div>
                {entreprise.contact_telephone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${entreprise.contact_telephone}`} className="hover:text-primary">
                      {entreprise.contact_telephone}
                    </a>
                  </div>
                )}
                {entreprise.contact_email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${entreprise.contact_email}`} className="hover:text-primary">
                      {entreprise.contact_email}
                    </a>
                  </div>
                )}
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
                  {/* Essence */}
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

                  {/* Gasoil */}
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
              entrepriseId={profile?.entreprise_id}
              title="Évolution des stocks de l'entreprise"
            />

            {/* Orders List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Commandes en cours</CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchData} className="h-8 w-8 p-0" title="Actualiser">
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune commande récente</p>
                  ) : (
                    orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-sm">
                            {order.carburant.toUpperCase()} - {order.quantite_demandee.toLocaleString()} L
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()} • {order.station?.nom || '🏢 Stock Central'}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          order.statut === 'en_attente' && "bg-yellow-100 text-yellow-800",
                          order.statut === 'approuve' && "bg-blue-100 text-blue-800",
                          order.statut === 'en_cours' && "bg-purple-100 text-purple-800",
                          order.statut === 'livre' && "bg-green-100 text-green-800",
                          order.statut === 'annule' && "bg-red-100 text-red-800",
                        )}>
                          {order.statut.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stations List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Stations ({stations.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsStationDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stations.map(station => {
                    const essencePercent = getStockPercentage(station.stock_essence, station.capacite_essence);
                    const gasoilPercent = getStockPercentage(station.stock_gasoil, station.capacite_gasoil);
                    const essenceLevel = getStockLevel(station.stock_essence, station.capacite_essence);
                    const gasoilLevel = getStockLevel(station.stock_gasoil, station.capacite_gasoil);
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
                      <Button variant="outline" className="mt-3 gap-2" onClick={() => setIsStationDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Ajouter une station
                      </Button>
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
                            <p className="font-medium text-sm">{alert.station_nom}</p>
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

      {/* Livraison Dialog */}
      <Dialog open={isLivraisonDialogOpen} onOpenChange={setIsLivraisonDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enregistrer une Livraison</DialogTitle>
            <DialogDescription>
              Mise à jour directe du stock pour une de vos stations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="station">Station *</Label>
              <Select
                value={newLivraison.station_id}
                onValueChange={(v) => setNewLivraison({ ...newLivraison, station_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carburant">Carburant *</Label>
                <Select
                  value={newLivraison.carburant}
                  onValueChange={(v) => setNewLivraison({ ...newLivraison, carburant: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essence">Essence</SelectItem>
                    <SelectItem value="gasoil">Gasoil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantite">Quantité (L) *</Label>
                <Input
                  id="quantite"
                  type="number"
                  placeholder="Ex: 10000"
                  value={newLivraison.quantite}
                  onChange={(e) => setNewLivraison({ ...newLivraison, quantite: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bon">Bon de Livraison</Label>
              <Input
                id="bon"
                placeholder="N° BL"
                value={newLivraison.bon_livraison}
                onChange={(e) => setNewLivraison({ ...newLivraison, bon_livraison: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLivraisonDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitLivraison} disabled={submitting}>
              {submitting ? "Enregistrement..." : "Confirmer la réception"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Station Creation Dialog */}
      <Dialog open={isStationDialogOpen} onOpenChange={setIsStationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle station</DialogTitle>
            <DialogDescription>
              Ajouter une station à {entreprise?.nom || 'votre entreprise'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Nom de la station *</Label>
              <Input
                value={stationForm.nom}
                onChange={(e) => setStationForm({ ...stationForm, nom: e.target.value })}
                placeholder="Ex: Station Centre-ville"
              />
            </div>
            <div className="space-y-2">
              <Label>Code unique *</Label>
              <Input
                value={stationForm.code}
                onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })}
                placeholder="Ex: TE-CON-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Adresse *</Label>
              <Input
                value={stationForm.adresse}
                onChange={(e) => setStationForm({ ...stationForm, adresse: e.target.value })}
                placeholder="Ex: Avenue de la République"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville *</Label>
                <Input
                  value={stationForm.ville}
                  onChange={(e) => setStationForm({ ...stationForm, ville: e.target.value })}
                  placeholder="Ex: Conakry"
                />
              </div>
              <div className="space-y-2">
                <Label>Région *</Label>
                <Select
                  value={stationForm.region}
                  onValueChange={(v) => setStationForm({ ...stationForm, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={stationForm.type}
                onValueChange={(v: 'urbaine' | 'routiere' | 'depot') => setStationForm({ ...stationForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urbaine">Urbaine</SelectItem>
                  <SelectItem value="routiere">Routière</SelectItem>
                  <SelectItem value="depot">Dépôt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacité essence (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_essence || ''}
                  onChange={(e) => setStationForm({ ...stationForm, capacite_essence: parseInt(e.target.value) || 0 })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacité gasoil (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_gasoil || ''}
                  onChange={(e) => setStationForm({ ...stationForm, capacite_gasoil: parseInt(e.target.value) || 0 })}
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gestionnaire (nom)</Label>
              <Input
                value={stationForm.gestionnaire_nom}
                onChange={(e) => setStationForm({ ...stationForm, gestionnaire_nom: e.target.value })}
                placeholder="Nom du gestionnaire"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStationDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveStation} disabled={savingStation}>
              {savingStation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Creation Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Passer une commande à la SONAP</DialogTitle>
            <DialogDescription>
              Commandez du carburant pour votre entreprise ou une station spécifique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select
                value={orderForm.station_id}
                onValueChange={(v) => setOrderForm({ ...orderForm, station_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enterprise_stock" className="font-semibold">
                    🏢 Stock Entreprise / Dépôt Central
                  </SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>⛽ {s.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sélectionnez "Stock Entreprise" si vous n'avez pas encore déterminé la station de destination.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carburant *</Label>
                <Select
                  value={orderForm.carburant}
                  onValueChange={(v) => setOrderForm({ ...orderForm, carburant: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essence">Essence</SelectItem>
                    <SelectItem value="gasoil">Gasoil</SelectItem>
                    <SelectItem value="gpl">GPL</SelectItem>
                    <SelectItem value="lubrifiants">Lubrifiants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantité (L/Tonnes) *</Label>
                <Input
                  type="number"
                  value={orderForm.quantite}
                  onChange={(e) => setOrderForm({ ...orderForm, quantite: e.target.value })}
                  placeholder="Ex: 50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={orderForm.priorite}
                onValueChange={(v) => setOrderForm({ ...orderForm, priorite: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="urgente" className="text-red-600">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optionnel)</Label>
              <Input
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="Instructions particulières..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitOrder} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Envoi...
                </>
              ) : (
                'Envoyer la commande'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
