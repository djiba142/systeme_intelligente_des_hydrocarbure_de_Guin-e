import { useEffect, useState, useCallback } from 'react';
import {
  Ship,
  Package,
  Globe,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { StockEvolutionChart } from '@/components/charts/StockEvolutionChart';
import { GuineaMap } from '@/components/map/GuineaMap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useRealtimeStations } from '@/hooks/useRealtimeStations';
import { useRealtimeAlertes } from '@/hooks/useRealtimeAlertes';

// Définition des types pour éviter le "any"
type StationType = 'urbaine' | 'autoroute' | 'portuaire' | 'depot';
type StationStatus = 'active' | 'en_travaux' | 'fermee' | 'alerte';

interface Importation {
  id: string;
  navire_nom: string;
  carburant: string;
  quantite_tonnes: number;
  port_origine: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  statut: string;
}

interface StockAccumulator {
  essence: number;
  gasoil: number;
  gpl: number;
}

export default function DashboardSONAP() {
  const [importations, setImportations] = useState<Importation[]>([]);
  const [loading, setLoading] = useState(true);

  const { stations: realtimeStations, refetch: refetchStations } = useRealtimeStations();
  // Note: On garde alertes, criticalCount, warningCount si tu souhaites les utiliser plus bas
  useRealtimeAlertes({ showToast: true });

  const mapStations = realtimeStations.map(s => ({
    id: s.id,
    nom: s.nom,
    code: s.code,
    ville: s.ville,
    region: s.region,
    adresse: s.adresse,
    type: s.type as StationType,
    statut: s.statut as StationStatus,
    entrepriseId: s.entreprise_id,
    entrepriseNom: '',
    coordonnees: s.latitude && s.longitude ? { lat: s.latitude, lng: s.longitude } : undefined,
    stockActuel: { 
      essence: s.stock_essence || 0, 
      gasoil: s.stock_gasoil || 0, 
      gpl: s.stock_gpl || 0, 
      lubrifiants: s.stock_lubrifiants || 0 
    },
    capacite: { 
      essence: s.capacite_essence || 0, 
      gasoil: s.capacite_gasoil || 0, 
      gpl: s.capacite_gpl || 0, 
      lubrifiants: s.capacite_lubrifiants || 0 
    },
    gestionnaire: { 
      nom: s.gestionnaire_nom || '', 
      telephone: s.gestionnaire_telephone || '', 
      email: '' 
    },
    nombrePompes: s.nombre_pompes || 0,
  }));

  const fetchImportations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('importations')
        .select('*')
        .order('date_arrivee_prevue', { ascending: true });

      if (error) throw error;
      setImportations(data || []);
    } catch (error) {
      console.error('Error fetching importations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImportations();

    const channel = supabase
      .channel('importations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'importations' }, () => {
        fetchImportations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchImportations]);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'planifie': return 'bg-gray-100 text-gray-700';
      case 'en_route': return 'bg-blue-100 text-blue-700';
      case 'au_port': return 'bg-amber-100 text-amber-700';
      case 'dechargement': return 'bg-emerald-100 text-emerald-700';
      case 'termine': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (statut: string) => {
    const labels: Record<string, string> = {
      planifie: 'Planifié',
      en_route: 'En route',
      au_port: 'Au port',
      dechargement: 'Déchargement',
      termine: 'Terminé'
    };
    return labels[statut] || statut;
  };

  const calculateETA = (dateArrivee: string | null) => {
    if (!dateArrivee) return 'Non défini';
    const arrival = new Date(dateArrivee);
    const now = new Date();
    const diffTime = arrival.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Arrivé';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Demain';
    return `${diffDays} jours`;
  };

  const CONSOMMATION_JOURNALIERE = {
    essence: 800000,
    gasoil: 1200000,
    gpl: 100000,
  };

  const stockNational = realtimeStations.reduce<StockAccumulator>((acc, station) => ({
    essence: acc.essence + (station.stock_essence || 0),
    gasoil: acc.gasoil + (station.stock_gasoil || 0),
    gpl: acc.gpl + (station.stock_gpl || 0),
  }), { essence: 0, gasoil: 0, gpl: 0 });

  const autonomie = {
    essence: Math.round(stockNational.essence / CONSOMMATION_JOURNALIERE.essence),
    gasoil: Math.round(stockNational.gasoil / CONSOMMATION_JOURNALIERE.gasoil),
  };

  return (
    <DashboardLayout
      title="Dashboard SONAP"
      subtitle="Suivi des importations et autonomie nationale"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <NationalAutonomyGauge daysRemaining={autonomie.essence || 0} fuelType="essence" />
        <NationalAutonomyGauge daysRemaining={autonomie.gasoil || 0} fuelType="gasoil" />
        <StatCard
          title="Navires en route"
          value={importations.filter(i => i.statut === 'en_route').length}
          subtitle="cargaisons actives"
          icon={Ship}
          variant="default"
        />
        <StatCard
          title="Tonnage attendu"
          value={`${Math.round(importations.reduce((acc, i) => acc + (i.statut !== 'termine' ? i.quantite_tonnes : 0), 0) / 1000)}k`}
          subtitle="tonnes en transit"
          icon={Package}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Carte de Vigilance
                  </CardTitle>
                  <CardDescription>Niveau des stocks par région</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchStations()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/carte">Vue complète</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <GuineaMap stations={mapStations} height="400px" showControls={false} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Pipeline Maritime
            </CardTitle>
            <CardDescription>Cargaisons en cours et prévues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground italic">Chargement...</div>
            ) : importations.filter(i => i.statut !== 'termine').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune importation en cours</div>
            ) : (
              importations.filter(i => i.statut !== 'termine').slice(0, 5).map((imp) => (
                <div key={imp.id} className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{imp.navire_nom}</span>
                    <Badge className={getStatusColor(imp.statut)}>{getStatusLabel(imp.statut)}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cargaison</span>
                      <span className="font-medium">{imp.quantite_tonnes.toLocaleString()} T de {imp.carburant}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ETA</span>
                      <span className="font-medium text-primary">{calculateETA(imp.date_arrivee_prevue)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StockEvolutionChart title="Évolution des Stocks Nationaux" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Distributeurs
            </CardTitle>
            <CardDescription>Volume stocké vs capacité par entreprise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { nom: 'TotalEnergies', stock: 75, capacite: 100 },
              { nom: 'Shell', stock: 60, capacite: 100 },
              { nom: 'Kamsar Petroleum', stock: 45, capacite: 80 },
              { nom: 'TMI', stock: 55, capacite: 70 },
              { nom: 'Star Oil', stock: 30, capacite: 60 },
            ].map((dist, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{dist.nom}</span>
                  <span className="text-xs text-muted-foreground">{dist.stock}k / {dist.capacite}k L</span>
                </div>
                <Progress value={(dist.stock / dist.capacite) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertes Prix et Fraude
              </CardTitle>
              <CardDescription>Écarts de prix détectés par rapport au tarif officiel</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/alertes">Voir tout</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { station: 'KP Lambanyi', ecart: '+500 GNF', status: 'non_resolu' },
              { station: 'TMI Kaloum', ecart: '+300 GNF', status: 'en_cours' },
              { station: 'Star Oil Kindia', ecart: '+200 GNF', status: 'resolu' },
            ].map((alerte, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alerte.status === 'non_resolu' ? 'bg-red-50 border-red-200' : 
                  alerte.status === 'en_cours' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{alerte.station}</span>
                  {alerte.status === 'resolu' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                   alerte.status === 'en_cours' ? <Clock className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                </div>
                <p className="text-sm">Écart: <span className="font-semibold text-red-600">{alerte.ecart}</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alerte.status === 'resolu' ? 'Résolu' : alerte.status === 'en_cours' ? 'Inspecteur envoyé' : 'Action requise'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}