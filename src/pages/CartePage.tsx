import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GuineaMap } from '@/components/map/GuineaMap';
import { supabase } from '@/integrations/supabase/client';
import { Station } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, RefreshCw, Loader2, AlertTriangle, Fuel, BarChart3, Ship, MapPin, Building2 } from 'lucide-react';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';

const REGIONS = [
  'Conakry', 'Boké', 'Kindia', 'Mamou', 'Labé',
  'Faranah', 'Kankan', 'N\'Zérékoré',
];

export default function CartePage() {
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string; sigle: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');
  const [importationsCount, setImportationsCount] = useState(0);
  const [depots, setDepots] = useState<any[]>([]);
  const [ships, setShips] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('stations')
        .select(`
          id, nom, code, adresse, ville, region, type, statut,
          nombre_pompes,
          stock_essence, stock_gasoil, stock_gpl, stock_lubrifiants,
          capacite_essence, capacite_gasoil, capacite_gpl, capacite_lubrifiants,
          latitude, longitude,
          gestionnaire_nom, gestionnaire_telephone, gestionnaire_email,
          entreprise_id,
          entreprise:entreprises!entreprise_id(id, nom, sigle)
        `);

      if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id) {
        query = query.eq('entreprise_id', currentUserProfile.entreprise_id);
      } else if (currentUserRole === 'inspecteur' && currentUserProfile?.region) {
        query = query.eq('region', currentUserProfile.region);
      }

      const { data: stData } = await query.order('nom');

      const getFallbackCoords = (region: string, code: string) => {
        const normalized = region?.toLowerCase() || '';
        // Utiliser une valeur numérique basée sur le code pour générer un décalage déterministe
        const hash = code ? code.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : Math.random() * 1000;
        const offsetLat = ((hash % 100) / 1000) - 0.05;
        const offsetLng = (((hash * 13) % 100) / 1000) - 0.05;

        const addOffset = (lat: number, lng: number) => ({ lat: lat + offsetLat, lng: lng + offsetLng });

        if (normalized.includes('boke') || normalized.includes('boké')) return addOffset(10.9409, -14.2967);
        if (normalized.includes('kindia')) return addOffset(10.0569, -12.8658);
        if (normalized.includes('mamou')) return addOffset(10.3711, -12.0836);
        if (normalized.includes('labe') || normalized.includes('labé')) return addOffset(11.3182, -12.2833);
        if (normalized.includes('faranah')) return addOffset(10.0404, -10.7434);
        if (normalized.includes('kankan')) return addOffset(10.3854, -9.3057);
        if (normalized.includes('nzerekore') || normalized.includes('zérékoré')) return addOffset(7.7562, -8.8179);
        return addOffset(9.5091 + offsetLat/2, -13.7122 + offsetLng/2); // Conakry fallback
      };

      const mapped: Station[] = (stData || []).map((s: any) => ({
        id: s.id,
        nom: s.nom,
        code: s.code || '',
        adresse: s.adresse || '',
        ville: s.ville || '',
        region: s.region || '',
        type: s.type || 'urbaine',
        statut: s.statut || 'ouverte',
        entrepriseId: s.entreprise_id || '',
        entrepriseNom: s.entreprise?.nom || '',
        entrepriseSigle: s.entreprise?.sigle || '',
        nombrePompes: s.nombre_pompes || 0,
        coordonnees: (s.latitude !== null && s.longitude !== null)
          ? { lat: Number(s.latitude), lng: Number(s.longitude) }
          : getFallbackCoords(s.region, s.code || s.id),
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
        gestionnaire: {
          nom: s.gestionnaire_nom || '',
          telephone: s.gestionnaire_telephone || '',
          email: s.gestionnaire_email || '',
        },
        derniereLivraison: {
          date: '8 mars',
          quantite: 15000,
          carburant: 'essence'
        },
        // Smart Pénurie: Calcul du risque (si stock < 15% ou consommation élevée détectée)
        isRiskOfShortage: (s.stock_essence / (s.capacite_essence || 1) < 0.15) || (s.stock_gasoil / (s.capacite_gasoil || 1) < 0.15)
      }));

      setStations(mapped);

      const uniqueEntreprises = Array.from(
        new Map(
          (stData || [])
            .filter((s: any) => s.entreprise)
            .map((s: any) => [s.entreprise.id, s.entreprise])
        ).values()
      ) as { id: string; nom: string; sigle: string }[];

      setEntreprises(uniqueEntreprises.sort((a, b) => (a.sigle || a.nom).localeCompare(b.sigle || b.nom)));

      // Auto-select entreprise for responsable_entreprise
      if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id) {
        setSelectedEntreprise(currentUserProfile.entreprise_id);
      }

      // Fetch importations count and ships
      const { data: impData } = await (supabase as any)
        .from('importations')
        .select('*')
        .in('statut', ['en_transit', 'arrive_conakry', 'valide_juridique']);
      
      const shipsData = (impData || [])
          .filter((i: any) => i.statut === 'en_transit' || i.statut === 'arrive_conakry')
          .map((i: any, idx: number) => ({
              ...i,
              // Random positions in the Atlantic if not set
              latitude: i.latitude || (9.2 + Math.random() * 0.5),
              longitude: i.longitude || (-14.5 - Math.random() * 0.5)
          }));
      
      setShips(shipsData);
      setImportationsCount(impData?.length || 0);

      // Mock Depots for strategic view
      setDepots([
          { id: 'd1', nom: 'Dépôt Central Kaloum', latitude: 9.5107, longitude: -13.7001, capacite: 85000, stock: 42000, region: 'Conakry' },
          { id: 'd2', nom: 'Dépôt Régional Mamou', latitude: 10.3744, longitude: -12.0915, capacite: 15000, stock: 8500, region: 'Mamou' },
          { id: 'd3', nom: 'Dépôt Kankan', latitude: 10.3854, longitude: -9.3057, capacite: 20000, stock: 12400, region: 'Kankan' },
          { id: 'd4', nom: 'Dépôt N\'Zérékoré', latitude: 7.7562, longitude: -8.8179, capacite: 12000, stock: 3200, region: 'N\'Zérékoré' },
      ]);
    } catch (err) {
      console.error('CartePage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      // 1. Role-based restrictions
      if (currentUserRole === 'responsable_entreprise' && s.entrepriseId !== currentUserProfile?.entreprise_id) {
        return false;
      }
      if (currentUserRole === 'inspecteur' && currentUserProfile?.region && s.region !== currentUserProfile.region) {
        return false;
      }

      // 2. User-selected filters
      if (selectedRegion !== 'all' && s.region !== selectedRegion) return false;
      if (selectedEntreprise !== 'all' && s.entrepriseId !== selectedEntreprise) return false;
      
      // Fuel Type filter
      if (selectedFuelType !== 'all') {
        if (selectedFuelType === 'essence' && s.stockActuel.essence === 0) return false;
        if (selectedFuelType === 'gasoil' && s.stockActuel.gasoil === 0) return false;
      }

      if (filterStatus === 'en_rupture') {
        const totalStock = s.stockActuel.essence + s.stockActuel.gasoil;
        if (totalStock > 0) return false;
      } else if (filterStatus === 'faible') {
        const essencePct = (s.stockActuel.essence / (s.capacite.essence || 1)) * 100;
        const gasoilPct = (s.stockActuel.gasoil / (s.capacite.gasoil || 1)) * 100;
        if (essencePct > 25 && gasoilPct > 25) return false;
      } else if (filterStatus === 'fermee' && s.statut !== 'fermee' && s.statut !== 'maintenance' && s.statut !== 'en_travaux') {
        return false;
      }

      return true;
    });
  }, [stations, selectedRegion, selectedEntreprise, filterStatus, selectedFuelType, currentUserRole, currentUserProfile]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStations.forEach(s => {
      counts[s.region] = (counts[s.region] || 0) + 1;
    });
    return counts;
  }, [filteredStations]);

  const availableRegions = useMemo(() => {
    const fromData = Array.from(new Set(stations.map(s => s.region).filter(Boolean))).sort();
    const merged = Array.from(new Set([...fromData, ...REGIONS])).sort();
    return merged;
  }, [stations]);
  const stationsInRupture = filteredStations.filter(s => (s.stockActuel.essence + s.stockActuel.gasoil) === 0);
  const stationsLowStock = filteredStations.filter(s => {
    const essencePct = (s.stockActuel.essence / s.capacite.essence) * 100;
    const gasoilPct = (s.stockActuel.gasoil / s.capacite.gasoil) * 100;
    return essencePct < 25 || gasoilPct < 25;
  });

  const totalNationalStock = filteredStations.reduce((acc, s) => acc + s.stockActuel.essence + s.stockActuel.gasoil, 0);

  const isNationalAlert = stationsInRupture.length >= 5;

  return (
    <DashboardLayout
      title="Carte Nationale"
      subtitle="Supervision géographique et analytique des flux"
    >
      {stationsInRupture.length > 0 && (
        <div className={cn(
          "mb-6 border p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden group transition-all shrink-0",
          isNationalAlert 
            ? "bg-gradient-to-br from-red-950/95 to-red-900/90 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse" 
            : "bg-slate-900 border-amber-500/30"
        )}>
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center border z-10 shrink-0",
            isNationalAlert ? "bg-red-500/30 border-red-400" : "bg-amber-500/20 border-amber-500/30"
          )}>
            <AlertTriangle className={cn("h-7 w-7", isNationalAlert ? "text-red-400" : "text-amber-500")} />
          </div>
          <div className="z-10 flex-1 text-center sm:text-left">
            <h4 className={cn(
              "font-black text-xs uppercase tracking-[0.2em] mb-1.5",
              isNationalAlert ? "text-red-400" : "text-amber-500"
            )}>
              {isNationalAlert ? "⚠️ ALERTE CARBURANT" : "⚠️ Point de Vigilance Logistique"}
            </h4>
            <p className="text-sm text-slate-100 font-bold leading-relaxed">
              Detection de {stationsInRupture.length} station{stationsInRupture.length > 1 ? 's' : ''} en rupture 
              {selectedRegion !== 'all' ? ` identifiés dans la zone ${selectedRegion}` : ' sur l\'ensemble du territoire'}.
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">
              {isNationalAlert ? "Action Ministérielle Requise : Redéploiement d'urgence des stocks dépôts" : "Recommandation : Surveillance accrue des réapprovisionnements"}
            </p>
          </div>
          <div className="z-10 bg-red-500/10 px-4 py-2 rounded-xl border-2 border-red-500/20">
            <span className="text-2xl font-black text-red-500">{stationsInRupture.length}</span>
            <span className="text-[10px] font-black text-red-500/70 ml-2 uppercase">Ruptures</span>
          </div>
        </div>
      )}

      {/* KPI Section - Now reactive to filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <CardKpi 
          label="Stations Affichées" 
          value={filteredStations.length} 
          icon={MapPin} 
          color="primary"
          trend={stations.length > 0 ? `${Math.round((filteredStations.length / stations.length) * 100)}% du parc` : undefined}
        />
        <CardKpi 
          label="Points de Rupture" 
          value={stationsInRupture.length} 
          icon={AlertTriangle} 
          color="red"
          isAlert={stationsInRupture.length > 0}
          trend={stationsInRupture.length > 0 ? "Action Requise" : "Normal"}
        />
        <CardKpi 
          label="Stock National" 
          value={(totalNationalStock / 1000000).toFixed(1) + 'M L'} 
          icon={BarChart3} 
          color="emerald"
          subtitle="Volume Global"
        />
        <CardKpi 
          label="Importations en cours" 
          value={importationsCount} 
          icon={Ship} 
          color="blue"
          subtitle="Navires attendus"
        />
      </div>

      {/* Filters Design Upgrade */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrage Stratégique</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 flex-1">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full lg:w-[220px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Toutes les régions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les régions</SelectItem>
              {availableRegions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise} disabled={currentUserRole === 'responsable_entreprise'}>
            <SelectTrigger className="w-full lg:w-[180px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Toutes les marques" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les marques</SelectItem>
              {entreprises.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.sigle || e.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-[150px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              <SelectItem value="en_rupture">En Rupture</SelectItem>
              <SelectItem value="faible">Stock Faible</SelectItem>
              <SelectItem value="fermee">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
            <SelectTrigger className="w-full lg:w-[150px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Carburant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous carburants</SelectItem>
              <SelectItem value="essence">Essence</SelectItem>
              <SelectItem value="gasoil">Gasoil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-800", loading && "bg-slate-100 animate-spin")}
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter">
            Total SIHG: {stations.length}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-100 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[650px] shadow-inner relative">
          <GuineaMap 
            stations={filteredStations} 
            depots={depots}
            ships={ships}
            height="100%" 
          />
          
          {/* Legend Overlay */}
          <div className="absolute bottom-6 left-6 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Légende des Stocks</h5>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">NORMAL (&gt; 25%)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">ALERTE (&lt; 25%)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">CRITIQUE (&lt; 10%)</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-primary" />
              Autonomie Nationale
            </h3>
            <div className="space-y-8">
              <NationalAutonomyGauge daysRemaining={12} fuelType="essence" />
              <NationalAutonomyGauge daysRemaining={15} fuelType="gasoil" />
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              Parts de Marché (Stations)
            </h3>
            <div className="space-y-4">
              {Object.entries(
                filteredStations.reduce((acc: any, s) => {
                  const key = s.entrepriseSigle || s.entrepriseNom || 'Indépendant';
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]: any) => (
                  <div key={name} className="group flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 uppercase tracking-tight">{name}</span>
                      <span className="text-primary">{count}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${(count / filteredStations.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Concentration par Région
            </h3>
            <div className="space-y-4">
              {Object.entries(regionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([region, count]) => (
                  <div key={region} className="group flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight">{region}</span>
                      <span className="text-primary">{count}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-foreground transform origin-left transition-transform duration-1000"
                        style={{ width: `${(count / filteredStations.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              {Object.keys(regionCounts).length === 0 && !loading && (
                <div className="text-center py-8 opacity-20">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
                  <p className="text-[10px] font-bold">Initialisation...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function CardKpi({ label, value, icon: Icon, color, trend, subtitle, isAlert }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    red: 'text-red-600 bg-red-100 border-red-200',
    emerald: 'text-emerald-600 bg-emerald-100 border-emerald-200',
    blue: 'text-blue-600 bg-blue-100 border-blue-200',
  };

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group",
      isAlert && "border-red-500/50 bg-red-50/10 dark:bg-red-950/20"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-xl border transition-colors group-hover:scale-110 duration-300", colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && <Badge variant="secondary" className="text-[9px] font-black">{trend}</Badge>}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h4 className={cn("text-2xl font-black tracking-tighter", isAlert ? "text-red-500" : "text-slate-900 dark:text-slate-100")}>{value}</h4>
        {subtitle && <p className="text-[10px] font-bold text-slate-500 mt-1 italic opacity-70">{subtitle}</p>}
      </div>
    </div>
  );
}
