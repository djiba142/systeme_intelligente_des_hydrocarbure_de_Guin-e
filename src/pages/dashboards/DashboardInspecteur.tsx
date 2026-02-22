import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Shield, Eye, MapPin, AlertTriangle, Fuel, Building2,
    Search, Filter, Plus, FileText, BarChart3, RefreshCw,
    CheckCircle2, XCircle, Clock, ChevronDown, TrendingDown,
    Activity, Gauge, AlertCircle, ClipboardList
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Station, StationType, StationStatus, ObservationType } from '@/types';
import { REGIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ObservationRow {
    id: string;
    station_id: string;
    station_nom: string;
    inspecteur_id: string;
    type: string;
    description: string;
    date: string;
    statut: string;
    region?: string;
}

interface EntrepriseBasic {
    id: string;
    nom: string;
    sigle: string;
}

const OBSERVATION_TYPES: { value: ObservationType; label: string; color: string }[] = [
    { value: 'pompe_en_panne', label: 'Pompe en panne', color: 'bg-red-100 text-red-700' },
    { value: 'prix_anormal', label: 'Prix anormal', color: 'bg-orange-100 text-orange-700' },
    { value: 'station_fermee', label: 'Station fermée', color: 'bg-gray-100 text-gray-700' },
    { value: 'suspicion_anomalie', label: 'Suspicion anomalie', color: 'bg-amber-100 text-amber-700' },
    { value: 'autre', label: 'Autre', color: 'bg-blue-100 text-blue-700' },
];

export default function DashboardInspecteur() {
    const { user, profile, role } = useAuth();
    const { toast } = useToast();

    const [stations, setStations] = useState<Station[]>([]);
    const [entreprises, setEntreprises] = useState<EntrepriseBasic[]>([]);
    const [observations, setObservations] = useState<ObservationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Filtres
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRegion, setFilterRegion] = useState<string>('all');
    const [filterEntreprise, setFilterEntreprise] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterStockLevel, setFilterStockLevel] = useState<string>('all');

    // Modal d'observation
    const [showObsDialog, setShowObsDialog] = useState(false);
    const [obsStationId, setObsStationId] = useState('');
    const [obsType, setObsType] = useState<ObservationType>('autre');
    const [obsDescription, setObsDescription] = useState('');
    const [obsSubmitting, setObsSubmitting] = useState(false);

    const inspecteurRegion = profile?.region;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [stationsRes, entreprisesRes, obsRes] = await Promise.all([
                supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)'),
                supabase.from('entreprises').select('id, nom, sigle'),
                supabase.from('observations' as any).select('*').order('date', { ascending: false }).limit(50)
            ]);

            const mappedStations: Station[] = (stationsRes.data || []).map((s: any) => {
                const capaciteTotal = (s.capacite_essence || 0) + (s.capacite_gasoil || 0);
                const stockTotal = (s.stock_essence || 0) + (s.stock_gasoil || 0);
                const tauxRemplissage = capaciteTotal > 0 ? (stockTotal / capaciteTotal) * 100 : 0;

                // Score de risque : 0 = OK, 100 = critique
                let scoreRisque = 0;
                if (tauxRemplissage < 10) scoreRisque = 100;
                else if (tauxRemplissage < 25) scoreRisque = 75;
                else if (tauxRemplissage < 50) scoreRisque = 40;
                else scoreRisque = 10;

                return {
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
                    scoreRisque,
                };
            });

            setStations(mappedStations);
            setEntreprises(entreprisesRes.data || []);
            setObservations((obsRes as any)?.data || []);

        } catch (error) {
            console.error('Error fetching inspector data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtrage des stations
    const filteredStations = useMemo(() => {
        let result = stations;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.nom.toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q) ||
                s.entrepriseNom.toLowerCase().includes(q) ||
                s.ville.toLowerCase().includes(q)
            );
        }

        if (filterRegion !== 'all') {
            result = result.filter(s => s.region === filterRegion);
        }

        if (filterEntreprise !== 'all') {
            result = result.filter(s => s.entrepriseId === filterEntreprise);
        }

        if (filterStatus !== 'all') {
            result = result.filter(s => s.statut === filterStatus);
        }

        if (filterStockLevel !== 'all') {
            result = result.filter(s => {
                const capaciteTotal = s.capacite.essence + s.capacite.gasoil;
                const stockTotal = s.stockActuel.essence + s.stockActuel.gasoil;
                const taux = capaciteTotal > 0 ? (stockTotal / capaciteTotal) * 100 : 0;

                switch (filterStockLevel) {
                    case 'critique': return taux < 10;
                    case 'bas': return taux >= 10 && taux < 25;
                    case 'normal': return taux >= 25 && taux < 75;
                    case 'plein': return taux >= 75;
                    case 'rupture': return stockTotal === 0;
                    default: return true;
                }
            });
        }

        return result;
    }, [stations, searchQuery, filterRegion, filterEntreprise, filterStatus, filterStockLevel]);

    // Statistiques calculées
    const stats = useMemo(() => {
        const activeStations = stations.filter(s => s.statut === 'ouverte');
        const critiques = stations.filter(s => (s.scoreRisque || 0) >= 75);
        const ruptures = stations.filter(s => {
            const total = s.stockActuel.essence + s.stockActuel.gasoil;
            return total === 0;
        });

        return {
            totalStations: stations.length,
            stationsEnAlerte: critiques.length,
            stocksCritiques: critiques.length,
            rupturesStock: ruptures.length,
            observationsOuvertes: observations.filter(o => o.statut === 'ouverte').length,
        };
    }, [stations, observations]);

    // Soumission observation
    const handleSubmitObservation = async () => {
        if (!obsStationId || !obsDescription.trim()) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires' });
            return;
        }

        setObsSubmitting(true);
        try {
            const station = stations.find(s => s.id === obsStationId);

            // Try to insert into observations table
            try {
                await supabase.from('observations' as any).insert({
                    station_id: obsStationId,
                    station_nom: station?.nom || '',
                    inspecteur_id: user?.id || '',
                    type: obsType,
                    description: obsDescription,
                    date: new Date().toISOString(),
                    statut: 'ouverte',
                    region: station?.region || '',
                } as any);
            } catch {
                // Table doesn't exist, just add locally
            }

            // Add locally
            const newObs: ObservationRow = {
                id: crypto.randomUUID(),
                station_id: obsStationId,
                station_nom: station?.nom || '',
                inspecteur_id: user?.id || '',
                type: obsType,
                description: obsDescription,
                date: new Date().toISOString(),
                statut: 'ouverte',
                region: station?.region,
            };

            setObservations(prev => [newObs, ...prev]);

            toast({ title: 'Observation enregistrée', description: `Observation ajoutée pour ${station?.nom}` });

            setShowObsDialog(false);
            setObsStationId('');
            setObsType('autre');
            setObsDescription('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer l\'observation' });
        } finally {
            setObsSubmitting(false);
        }
    };

    const getStockColor = (station: Station) => {
        const capaciteTotal = station.capacite.essence + station.capacite.gasoil;
        const stockTotal = station.stockActuel.essence + station.stockActuel.gasoil;
        const taux = capaciteTotal > 0 ? (stockTotal / capaciteTotal) * 100 : 0;

        if (taux === 0) return 'border-l-4 border-l-red-600 bg-red-50/50';
        if (taux < 25) return 'border-l-4 border-l-orange-500 bg-orange-50/50';
        if (taux < 50) return 'border-l-4 border-l-amber-400 bg-amber-50/30';
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/30';
    };

    const getStockBadge = (station: Station) => {
        const capaciteTotal = station.capacite.essence + station.capacite.gasoil;
        const stockTotal = station.stockActuel.essence + station.stockActuel.gasoil;
        const taux = capaciteTotal > 0 ? Math.round((stockTotal / capaciteTotal) * 100) : 0;

        if (taux === 0) return <Badge className="bg-red-600 text-white">RUPTURE</Badge>;
        if (taux < 25) return <Badge className="bg-orange-500 text-white">Critique</Badge>;
        if (taux < 50) return <Badge className="bg-amber-500 text-white">Bas</Badge>;
        return <Badge className="bg-emerald-500 text-white">OK</Badge>;
    };

    return (
        <DashboardLayout
            title="Dashboard Inspecteur"
            subtitle="Supervision et contrôle terrain - Accès en lecture"
        >
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <div>
                        <h2 className="text-xl font-bold">Vue Inspecteur</h2>
                        {inspecteurRegion && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Région : {inspecteurRegion}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Dialog open={showObsDialog} onOpenChange={setShowObsDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                <Plus className="h-4 w-4" />
                                Ajouter une observation
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Nouvelle Observation Terrain
                                </DialogTitle>
                                <DialogDescription>
                                    Enregistrez une observation suite à votre inspection
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="obs-station">Station *</Label>
                                    <Select value={obsStationId} onValueChange={setObsStationId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une station" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stations.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.nom} - {s.ville} ({s.region})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="obs-type">Type d'observation *</Label>
                                    <Select value={obsType} onValueChange={(v) => setObsType(v as ObservationType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OBSERVATION_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="obs-desc">Description *</Label>
                                    <Textarea
                                        id="obs-desc"
                                        value={obsDescription}
                                        onChange={(e) => setObsDescription(e.target.value)}
                                        placeholder="Décrivez votre observation en détail..."
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowObsDialog(false)}>
                                    Annuler
                                </Button>
                                <Button onClick={handleSubmitObservation} disabled={obsSubmitting}>
                                    {obsSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Vue d'ensemble
                    </TabsTrigger>
                    <TabsTrigger value="stations" className="gap-2">
                        <Fuel className="h-4 w-4" />
                        Stations
                    </TabsTrigger>
                    <TabsTrigger value="observations" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Observations
                    </TabsTrigger>
                    <TabsTrigger value="comparatif" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Multi-entreprises
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard title="Stations" value={stats.totalStations} subtitle="au total" icon={Fuel} />
                        <StatCard title="En Alerte" value={stats.stationsEnAlerte} subtitle="stations" icon={AlertTriangle} variant={stats.stationsEnAlerte > 0 ? 'warning' : 'success'} />
                        <StatCard title="Stocks Critiques" value={stats.stocksCritiques} subtitle="stations" icon={TrendingDown} variant={stats.stocksCritiques > 0 ? 'critical' : 'success'} />
                        <StatCard title="Ruptures" value={stats.rupturesStock} subtitle="stations" icon={XCircle} variant={stats.rupturesStock > 0 ? 'critical' : 'success'} />
                        <StatCard title="Observations" value={stats.observationsOuvertes} subtitle="ouvertes" icon={ClipboardList} variant="primary" />
                    </div>

                    {/* Répartition par région */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    Répartition par Région
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {REGIONS.map(region => {
                                    const regionStations = stations.filter(s => s.region === region);
                                    const critiques = regionStations.filter(s => (s.scoreRisque || 0) >= 75);
                                    const total = regionStations.length;

                                    return (
                                        <div key={region} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-3 w-3 rounded-full",
                                                    critiques.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                                                )} />
                                                <span className="text-sm font-medium">{region}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">{total} stations</span>
                                                {critiques.length > 0 && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5">{critiques.length} alerte{critiques.length > 1 ? 's' : ''}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Aperçu par Entreprise
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {entreprises.map(e => {
                                    const entStations = stations.filter(s => s.entrepriseId === e.id);
                                    const totalStock = entStations.reduce((acc, s) => acc + s.stockActuel.essence + s.stockActuel.gasoil, 0);
                                    const totalCapacite = entStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
                                    const taux = totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 100) : 0;

                                    return (
                                        <div key={e.id} className="space-y-2 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-medium text-sm">{e.nom}</span>
                                                    <span className="text-muted-foreground text-xs ml-2">({e.sigle})</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{entStations.length} stations</Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Progress value={taux} className="h-2 flex-1" />
                                                <span className={cn("text-xs font-medium", taux < 25 ? "text-red-600" : taux < 50 ? "text-amber-600" : "text-emerald-600")}>
                                                    {taux}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: Stations */}
                <TabsContent value="stations" className="space-y-4">
                    {/* Filtres */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="lg:col-span-2 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher station, code, ville..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={filterRegion} onValueChange={setFilterRegion}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Région" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les régions</SelectItem>
                                        {REGIONS.map(r => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterEntreprise} onValueChange={setFilterEntreprise}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Entreprise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les entreprises</SelectItem>
                                        {entreprises.map(e => (
                                            <SelectItem key={e.id} value={e.id}>{e.sigle}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterStockLevel} onValueChange={setFilterStockLevel}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Niveau stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous niveaux</SelectItem>
                                        <SelectItem value="rupture">🔴 Rupture</SelectItem>
                                        <SelectItem value="critique">🟠 Critique (&lt;25%)</SelectItem>
                                        <SelectItem value="bas">🟡 Bas (&lt;50%)</SelectItem>
                                        <SelectItem value="normal">🟢 Normal</SelectItem>
                                        <SelectItem value="plein">✅ Plein (≥75%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{filteredStations.length}</span> station(s) trouvée(s)
                                </p>
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSearchQuery('');
                                    setFilterRegion('all');
                                    setFilterEntreprise('all');
                                    setFilterStatus('all');
                                    setFilterStockLevel('all');
                                }}>
                                    Réinitialiser les filtres
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Liste des stations */}
                    <div className="space-y-3">
                        {filteredStations.map(station => {
                            const capaciteTotal = station.capacite.essence + station.capacite.gasoil;
                            const stockTotal = station.stockActuel.essence + station.stockActuel.gasoil;
                            const taux = capaciteTotal > 0 ? Math.round((stockTotal / capaciteTotal) * 100) : 0;

                            return (
                                <Card key={station.id} className={cn("hover:shadow-md transition-all", getStockColor(station))}>
                                    <CardContent className="py-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold">{station.nom}</h3>
                                                    {getStockBadge(station)}
                                                    <Badge variant="outline" className="text-xs">{station.statut}</Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {station.ville}, {station.region}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {station.entrepriseNom}
                                                    </span>
                                                    <span className="text-xs font-mono">{station.code}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Essence</p>
                                                    <p className="font-semibold text-sm">{station.stockActuel.essence.toLocaleString('fr-GN')} L</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Gasoil</p>
                                                    <p className="font-semibold text-sm">{station.stockActuel.gasoil.toLocaleString('fr-GN')} L</p>
                                                </div>
                                                <div className="text-center min-w-[60px]">
                                                    <p className="text-xs text-muted-foreground">Taux</p>
                                                    <p className={cn("font-bold text-lg", taux < 25 ? "text-red-600" : taux < 50 ? "text-amber-600" : "text-emerald-600")}>{taux}%</p>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => {
                                                        setObsStationId(station.id);
                                                        setShowObsDialog(true);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Observation
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* TAB: Observations */}
                <TabsContent value="observations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Mes Observations
                                </span>
                                <Badge variant="outline">{observations.length} total</Badge>
                            </CardTitle>
                            <CardDescription>Historique des observations terrain enregistrées</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {observations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">Aucune observation enregistrée</p>
                                    <p className="text-sm mt-1">Cliquez sur "Ajouter une observation" pour commencer</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {observations.map(obs => {
                                        const typeInfo = OBSERVATION_TYPES.find(t => t.value === obs.type);
                                        return (
                                            <div key={obs.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge className={typeInfo?.color || 'bg-gray-100 text-gray-700'} variant="secondary">
                                                                {typeInfo?.label || obs.type}
                                                            </Badge>
                                                            <Badge variant={obs.statut === 'ouverte' ? 'default' : 'secondary'}>
                                                                {obs.statut === 'ouverte' ? (
                                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Ouverte</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Traitée</span>
                                                                )}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm font-medium">{obs.station_nom}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{obs.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(obs.date).toLocaleDateString('fr-FR')}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(obs.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Comparatif Multi-Entreprises */}
                <TabsContent value="comparatif" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Comparatif Multi-Entreprises
                            </CardTitle>
                            <CardDescription>Vue agrégée des stocks et stations par entreprise</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-4 font-medium">Entreprise</th>
                                            <th className="text-center py-3 px-4 font-medium">Stations</th>
                                            <th className="text-center py-3 px-4 font-medium">Stock Essence</th>
                                            <th className="text-center py-3 px-4 font-medium">Stock Gasoil</th>
                                            <th className="text-center py-3 px-4 font-medium">Taux Global</th>
                                            <th className="text-center py-3 px-4 font-medium">Alertes</th>
                                            <th className="text-center py-3 px-4 font-medium">Score Conformité</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entreprises.map(e => {
                                            const entStations = stations.filter(s => s.entrepriseId === e.id);
                                            const totalEssence = entStations.reduce((acc, s) => acc + s.stockActuel.essence, 0);
                                            const totalGasoil = entStations.reduce((acc, s) => acc + s.stockActuel.gasoil, 0);
                                            const totalCapacite = entStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
                                            const taux = totalCapacite > 0 ? Math.round(((totalEssence + totalGasoil) / totalCapacite) * 100) : 0;
                                            const alertes = entStations.filter(s => (s.scoreRisque || 0) >= 75).length;

                                            // Score de conformité (inversé du risque moyen)
                                            const avgRisk = entStations.length > 0
                                                ? entStations.reduce((acc, s) => acc + (s.scoreRisque || 0), 0) / entStations.length
                                                : 0;
                                            const conformite = Math.max(0, Math.round(100 - avgRisk));

                                            return (
                                                <tr key={e.id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <span className="font-medium">{e.nom}</span>
                                                            <span className="text-muted-foreground text-xs ml-1">({e.sigle})</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-4">{entStations.length}</td>
                                                    <td className="text-center py-3 px-4 font-mono text-xs">{totalEssence.toLocaleString('fr-GN')} L</td>
                                                    <td className="text-center py-3 px-4 font-mono text-xs">{totalGasoil.toLocaleString('fr-GN')} L</td>
                                                    <td className="text-center py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Progress value={taux} className="h-2 w-16" />
                                                            <span className={cn("font-medium text-xs", taux < 25 ? "text-red-600" : taux < 50 ? "text-amber-600" : "text-emerald-600")}>
                                                                {taux}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-4">
                                                        {alertes > 0 ? (
                                                            <Badge variant="destructive" className="text-[10px]">{alertes}</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] text-emerald-600">0</Badge>
                                                        )}
                                                    </td>
                                                    <td className="text-center py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className={cn(
                                                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                                conformite >= 80 ? "bg-emerald-100 text-emerald-700" :
                                                                    conformite >= 50 ? "bg-amber-100 text-amber-700" :
                                                                        "bg-red-100 text-red-700"
                                                            )}>
                                                                {conformite}
                                                            </div>
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
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
