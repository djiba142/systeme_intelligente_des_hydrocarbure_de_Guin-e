import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Building2, Fuel,
    MapPin, FileDown, RefreshCw, AlertTriangle, Activity,
    DollarSign, Package, Calendar, Filter,
    Database, PieChart, LineChart
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Station, StationType, StationStatus } from '@/types';
import { REGIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PrixOfficiel {
    carburant: string;
    prix_litre: number;
    date_effet: string;
}

interface StockHistory {
    date_releve: string;
    stock_essence: number;
    stock_gasoil: number;
}

export default function DashboardAnalyste() {
    const [stations, setStations] = useState<Station[]>([]);
    const [prixOfficiels, setPrixOfficiels] = useState<PrixOfficiel[]>([]);
    const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtres
    const [filterRegion, setFilterRegion] = useState<string>('all');
    const [filterPeriod, setFilterPeriod] = useState<string>('30');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const stationsRes = await supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)');

            const mappedStations: Station[] = (stationsRes.data || []).map((s: any) => ({
                id: s.id,
                nom: s.nom,
                code: s.code,
                adresse: s.adresse,
                ville: s.ville,
                region: s.region,
                type: s.type as StationType,
                entrepriseId: s.entreprise_id,
                entrepriseNom: s.entreprises?.nom || 'Inconnu',
                entrepriseSigle: s.entreprises?.sigle,
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
                gestionnaire: {
                    nom: s.gestionnaire_nom || '',
                    telephone: s.gestionnaire_telephone || '',
                    email: s.gestionnaire_email || '',
                },
                statut: s.statut as StationStatus,
            }));

            setStations(mappedStations);

            // These tables may not exist yet - handle gracefully
            try {
                const prixRes = await supabase.from('prix_officiels' as any).select('*').order('date_effet', { ascending: false }).limit(20);
                if (prixRes.data) setPrixOfficiels(prixRes.data as any[]);
            } catch { /* table may not exist */ }

            try {
                const historyRes = await supabase.from('historique_stocks' as any).select('*').order('date_releve', { ascending: false }).limit(100);
                if (historyRes.data) setStockHistory(historyRes.data as any[]);
            } catch { /* table may not exist */ }

        } catch (error) {
            console.error('Error fetching analyst data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Statistiques globales
    const globalStats = useMemo(() => {
        const filteredStations = filterRegion !== 'all'
            ? stations.filter(s => s.region === filterRegion)
            : stations;

        const totalEssence = filteredStations.reduce((acc, s) => acc + s.stockActuel.essence, 0);
        const totalGasoil = filteredStations.reduce((acc, s) => acc + s.stockActuel.gasoil, 0);
        const totalCapacite = filteredStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
        const tauxGlobal = totalCapacite > 0 ? Math.round(((totalEssence + totalGasoil) / totalCapacite) * 100) : 0;

        const stationsActives = filteredStations.filter(s => s.statut === 'ouverte').length;
        const stationsCritiques = filteredStations.filter(s => {
            const cap = s.capacite.essence + s.capacite.gasoil;
            const stk = s.stockActuel.essence + s.stockActuel.gasoil;
            return cap > 0 && (stk / cap) < 0.25;
        }).length;

        // KPI: Autonomie
        const CONSO_JOUR = { essence: 800000, gasoil: 1200000 };
        const autonomieEssence = totalEssence > 0 ? Math.round(totalEssence / CONSO_JOUR.essence) : 0;
        const autonomieGasoil = totalGasoil > 0 ? Math.round(totalGasoil / CONSO_JOUR.gasoil) : 0;

        // Entreprises uniques
        const entreprisesUniques = new Set(filteredStations.map(s => s.entrepriseId)).size;

        return {
            totalStations: filteredStations.length,
            stationsActives,
            stationsCritiques,
            totalEssence,
            totalGasoil,
            tauxGlobal,
            autonomieEssence,
            autonomieGasoil,
            entreprisesUniques,
        };
    }, [stations, filterRegion]);

    // Données par région pour le tableau
    const regionData = useMemo(() => {
        return REGIONS.map(region => {
            const regionStations = stations.filter(s => s.region === region);
            const totalEssence = regionStations.reduce((acc, s) => acc + s.stockActuel.essence, 0);
            const totalGasoil = regionStations.reduce((acc, s) => acc + s.stockActuel.gasoil, 0);
            const totalCapacite = regionStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
            const taux = totalCapacite > 0 ? Math.round(((totalEssence + totalGasoil) / totalCapacite) * 100) : 0;
            const critiques = regionStations.filter(s => {
                const cap = s.capacite.essence + s.capacite.gasoil;
                const stk = s.stockActuel.essence + s.stockActuel.gasoil;
                return cap > 0 && (stk / cap) < 0.25;
            }).length;

            return {
                region,
                stations: regionStations.length,
                essence: totalEssence,
                gasoil: totalGasoil,
                taux,
                critiques,
            };
        }).filter(r => r.stations > 0);
    }, [stations]);

    // Export CSV
    const handleExportCSV = () => {
        const headers = ['Région', 'Stations', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Taux Occupation (%)', 'Stations Critiques'];
        const rows = regionData.map(r => [r.region, r.stations, r.essence, r.gasoil, r.taux, r.critiques]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rapport_analyste_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout
            title="Dashboard Analyste"
            subtitle="Analyse stratégique et statistiques nationales"
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">Analyse Stratégique</h2>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={filterRegion} onValueChange={setFilterRegion}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Toutes régions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les régions</SelectItem>
                            {REGIONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                        <FileDown className="h-4 w-4" />
                        Export CSV
                    </Button>

                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Stations Totales" value={globalStats.totalStations} subtitle={`dont ${globalStats.stationsActives} actives`} icon={Fuel} />
                <StatCard title="Entreprises" value={globalStats.entreprisesUniques} subtitle="distributeurs agréés" icon={Building2} />
                <StatCard
                    title="Stations Critiques"
                    value={globalStats.stationsCritiques}
                    subtitle="stock < 25%"
                    icon={AlertTriangle}
                    variant={globalStats.stationsCritiques > 0 ? 'critical' : 'success'}
                />
                <StatCard title="Taux Occupation" value={`${globalStats.tauxGlobal}%`} subtitle="capacité nationale" icon={Fuel} variant="primary" />
            </div>

            {/* Autonomie nationale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Autonomie Essence</p>
                                <p className="text-4xl font-bold text-blue-800 mt-1">{globalStats.autonomieEssence} <span className="text-lg">jours</span></p>
                                <p className="text-sm text-blue-600/70 mt-1">{globalStats.totalEssence.toLocaleString('fr-GN')} litres</p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-blue-200/50 flex items-center justify-center">
                                <Fuel className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600">Autonomie Gasoil</p>
                                <p className="text-4xl font-bold text-amber-800 mt-1">{globalStats.autonomieGasoil} <span className="text-lg">jours</span></p>
                                <p className="text-sm text-amber-600/70 mt-1">{globalStats.totalGasoil.toLocaleString('fr-GN')} litres</p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-amber-200/50 flex items-center justify-center">
                                <Fuel className="h-8 w-8 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="regions" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="regions" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Par Région
                    </TabsTrigger>
                    <TabsTrigger value="prix" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Prix & Évolution
                    </TabsTrigger>
                    <TabsTrigger value="kpi" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Indicateurs KPI
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Par Région */}
                <TabsContent value="regions">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Stocks par Région
                            </CardTitle>
                            <CardDescription>Comparatif régional des niveaux de stock</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-4 font-medium">Région</th>
                                            <th className="text-center py-3 px-4 font-medium">Stations</th>
                                            <th className="text-right py-3 px-4 font-medium">Essence (L)</th>
                                            <th className="text-right py-3 px-4 font-medium">Gasoil (L)</th>
                                            <th className="text-center py-3 px-4 font-medium">Taux</th>
                                            <th className="text-center py-3 px-4 font-medium">Alertes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regionData.map(r => (
                                            <tr key={r.region} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 font-medium">{r.region}</td>
                                                <td className="text-center py-3 px-4">{r.stations}</td>
                                                <td className="text-right py-3 px-4 font-mono text-xs">{r.essence.toLocaleString('fr-GN')}</td>
                                                <td className="text-right py-3 px-4 font-mono text-xs">{r.gasoil.toLocaleString('fr-GN')}</td>
                                                <td className="text-center py-3 px-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Progress value={r.taux} className="h-2 w-16" />
                                                        <span className={cn("font-medium text-xs min-w-[35px]",
                                                            r.taux < 25 ? "text-red-600" : r.taux < 50 ? "text-amber-600" : "text-emerald-600"
                                                        )}>{r.taux}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-center py-3 px-4">
                                                    {r.critiques > 0 ? (
                                                        <Badge variant="destructive" className="text-[10px]">{r.critiques}</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-emerald-600">0</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 bg-muted/30 font-bold">
                                            <td className="py-3 px-4">TOTAL NATIONAL</td>
                                            <td className="text-center py-3 px-4">{globalStats.totalStations}</td>
                                            <td className="text-right py-3 px-4 font-mono text-xs">{globalStats.totalEssence.toLocaleString('fr-GN')}</td>
                                            <td className="text-right py-3 px-4 font-mono text-xs">{globalStats.totalGasoil.toLocaleString('fr-GN')}</td>
                                            <td className="text-center py-3 px-4">
                                                <span className={cn("font-bold", globalStats.tauxGlobal < 25 ? "text-red-600" : globalStats.tauxGlobal < 50 ? "text-amber-600" : "text-emerald-600")}>
                                                    {globalStats.tauxGlobal}%
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-4">{globalStats.stationsCritiques}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Prix */}
                <TabsContent value="prix">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                Prix Officiels en Vigueur
                            </CardTitle>
                            <CardDescription>Historique des prix réglementés</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {prixOfficiels.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Aucune donnée de prix disponible</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left py-3 px-4 font-medium">Carburant</th>
                                                <th className="text-right py-3 px-4 font-medium">Prix / Litre (GNF)</th>
                                                <th className="text-right py-3 px-4 font-medium">Date d'effet</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prixOfficiels.map((p, i) => (
                                                <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4 font-medium capitalize">{p.carburant}</td>
                                                    <td className="text-right py-3 px-4 font-mono font-bold text-primary">{p.prix_litre.toLocaleString('fr-GN')} GNF</td>
                                                    <td className="text-right py-3 px-4 text-muted-foreground">
                                                        {new Date(p.date_effet).toLocaleDateString('fr-FR')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: KPI */}
                <TabsContent value="kpi" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Couverture Nationale</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {REGIONS.map(region => {
                                        const count = stations.filter(s => s.region === region).length;
                                        const max = Math.max(...REGIONS.map(r => stations.filter(s => s.region === r).length), 1);
                                        return (
                                            <div key={region} className="flex items-center gap-3">
                                                <span className="text-xs w-24 truncate">{region}</span>
                                                <Progress value={(count / max) * 100} className="h-2 flex-1" />
                                                <span className="text-xs font-mono w-6 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Distribution des Statuts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {['ouverte', 'fermee', 'en_travaux', 'attente_validation'].map(statut => {
                                        const count = stations.filter(s => s.statut === statut).length;
                                        const pct = stations.length > 0 ? Math.round((count / stations.length) * 100) : 0;
                                        const labels: Record<string, string> = {
                                            ouverte: 'Ouvertes',
                                            fermee: 'Fermées',
                                            en_travaux: 'En travaux',
                                            attente_validation: 'En attente',
                                        };
                                        const colors: Record<string, string> = {
                                            ouverte: 'bg-emerald-500',
                                            fermee: 'bg-red-500',
                                            en_travaux: 'bg-amber-500',
                                            attente_validation: 'bg-blue-500',
                                        };

                                        return (
                                            <div key={statut} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-3 w-3 rounded-full", colors[statut] || 'bg-gray-400')} />
                                                    <span className="text-sm">{labels[statut] || statut}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold">{count}</span>
                                                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Indicateurs Clés</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                        <span className="text-sm text-emerald-700">Taux disponibilité</span>
                                        <span className="font-bold text-emerald-700">
                                            {stations.length > 0 ? Math.round((stations.filter(s => s.statut === 'ouverte').length / stations.length) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        <span className="text-sm text-blue-700">Moy. stock/station</span>
                                        <span className="font-bold text-blue-700">
                                            {stations.length > 0
                                                ? Math.round(stations.reduce((a, s) => a + s.stockActuel.essence + s.stockActuel.gasoil, 0) / stations.length).toLocaleString('fr-GN')
                                                : 0} L
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                                        <span className="text-sm text-amber-700">Stations &lt; 25%</span>
                                        <span className="font-bold text-amber-700">{globalStats.stationsCritiques}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
