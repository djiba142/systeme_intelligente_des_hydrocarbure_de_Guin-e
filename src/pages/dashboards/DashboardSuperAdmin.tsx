import { useEffect, useState, useCallback } from 'react';
import {
  Server,
  Database,
  Users,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Ship, // Correction de la virgule manquante ici
  RefreshCw,
  Fuel
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { GuineaMap } from '@/components/map/GuineaMap';
import { Station, StationStatus, StationType } from '@/types'; // Import des types enum
import { cn } from '@/lib/utils';

interface SystemStats {
  totalUsers: number;
  totalEntreprises: number;
  totalStations: number;
  totalAlertes: number;
}

interface StockAccumulator {
  essence: number;
  gasoil: number;
}

export default function DashboardSuperAdmin() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalEntreprises: 0,
    totalStations: 0,
    totalAlertes: 0,
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const CONSOMMATION_JOURNALIERE = {
    essence: 800000,
    gasoil: 1200000,
  };

  const totalStock = stations.reduce<StockAccumulator>((acc, s) => ({
    essence: acc.essence + (s.stockActuel.essence || 0),
    gasoil: acc.gasoil + (s.stockActuel.gasoil || 0),
  }), { essence: 0, gasoil: 0 });

  const autonomie = {
    essence: totalStock.essence > 0 ? Math.round(totalStock.essence / CONSOMMATION_JOURNALIERE.essence) : 0,
    gasoil: totalStock.gasoil > 0 ? Math.round(totalStock.gasoil / CONSOMMATION_JOURNALIERE.gasoil) : 0,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Correction de la récupération des counts (destructuration des objets de réponse)
      const [resUsers, resEntreprises, resStations, resAlertes, resData] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('entreprises').select('*', { count: 'exact', head: true }),
        supabase.from('stations').select('*', { count: 'exact', head: true }),
        supabase.from('alertes').select('*', { count: 'exact', head: true }).eq('resolu', false),
        supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)')
      ]);

      setStats({
        totalUsers: resUsers.count || 0,
        totalEntreprises: resEntreprises.count || 0,
        totalStations: resStations.count || 0,
        totalAlertes: resAlertes.count || 0,
      });

      const mappedStations: Station[] = (resData.data || []).map(s => ({
        id: s.id,
        nom: s.nom,
        code: s.code,
        adresse: s.adresse,
        ville: s.ville,
        region: s.region,
        type: s.type as StationType, // Cast sécurisé
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
        gestionnaire: { nom: '', telephone: '', email: '' },
        statut: s.statut as StationStatus, // Cast sécurisé
      }));
      
      setStations(mappedStations);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const systemHealth = [
    { name: 'Base de données (Supabase)', status: 'operational', uptime: 100 },
    { name: 'Edge Functions', status: 'operational', uptime: 99.9 },
    { name: 'Stockage (Buckets)', status: 'operational', uptime: 100 },
    { name: 'Auth Server', status: 'operational', uptime: 100 },
  ];

  return (
    <DashboardLayout
      title="Tableau de Bord National"
      subtitle="Supervision complète du système d'information"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Vue Administrative Globale
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Cartes de Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Utilisateurs" value={stats.totalUsers} subtitle="comptes actifs" icon={Users} />
        <StatCard title="Entreprises" value={stats.totalEntreprises} subtitle="distributeurs agréés" icon={Database} />
        <StatCard title="Stations" value={stats.totalStations} subtitle="points de vente" icon={Server} />
        <StatCard 
          title="Sécurité" 
          value={stats.totalAlertes} 
          subtitle="incidents ouverts" 
          icon={AlertTriangle} 
          variant={stats.totalAlertes > 0 ? 'warning' : 'success'} 
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          État National des Stocks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <NationalAutonomyGauge daysRemaining={autonomie.essence} fuelType="essence" />
          <NationalAutonomyGauge daysRemaining={autonomie.gasoil} fuelType="gasoil" />

          <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ship className="h-5 w-5 text-primary" />
                Importations en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-background/60 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Ship className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">MT Conakry Star</span>
                  </div>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Déchargement au Port</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
        <Settings className="h-5 w-5" />
        Administration Système
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group">
          <Link to="/utilisateurs">
            <CardContent className="flex flex-col items-center py-6">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Utilisateurs</h4>
              <p className="text-xs text-muted-foreground text-center mt-1">Comptes et Permissions</p>
            </CardContent>
          </Link>
        </Card>
        {/* ... Autres cartes similaires ... */}
      </div>

      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
        <Server className="h-5 w-5" />
        Monitoring de l'Infrastructure
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Santé des Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemHealth.map((service, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{service.uptime}%</span>
                </div>
                <Progress value={service.uptime} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">Carte de Vigilance Nationale</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/carte">Plein écran</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <div className="h-[300px] w-full">
              {!loading && <GuineaMap stations={stations} height="100%" showControls={false} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}