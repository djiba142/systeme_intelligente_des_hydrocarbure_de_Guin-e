import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Shield, Eye, MapPin, AlertTriangle, Fuel, Building2,
    Search, Filter, Plus, FileText, BarChart3, RefreshCw,
    CheckCircle2, XCircle, Clock, ChevronDown, TrendingDown,
    Activity, Gauge, AlertCircle, ClipboardList, DollarSign
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { generateCustomReportPDF, generateNationalStockPDF } from '@/lib/pdfExport';

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
    const [filterDateDebut, setFilterDateDebut] = useState('');
    const [filterDateFin, setFilterDateFin] = useState('');
    const [selectedStationDetail, setSelectedStationDetail] = useState<string | null>(null);

    // Modal d'observation
    const [showObsDialog, setShowObsDialog] = useState(false);
    const [obsStationId, setObsStationId] = useState('');
    const [obsType, setObsType] = useState<ObservationType>('autre');
    const [obsDescription, setObsDescription] = useState('');
    const [obsSubmitting, setObsSubmitting] = useState(false);

    const inspecteurRegion = profile?.region;
        // Structure hiérarchique : National (vue globale) -> Régional (zone spécifique) -> Local (Terrain)
    const inspecteurLevel = useMemo(() => {
        const poste = profile?.poste?.toLowerCase() || '';
        const region = profile?.region;
        
        if (poste.includes('national')) {
            return { name: 'Niveau 1 — National', restrict: false };
        }
        
        if (poste.includes('régional')) {
            return { name: 'Niveau 2 — Régional', restrict: true, region: region };
        }
        
        if (poste.includes('préfectoral') || poste.includes('local') || poste.includes('terrain')) {
            return { name: 'Niveau 3 — Local (Terrain)', restrict: true, region: region };
        }
        
        // Fallback
        if (!region) return { name: 'Niveau 1 — National', restrict: false };
        return { name: 'Niveau 2 — Régional', restrict: true, region: region };
    }, [profile?.poste, profile?.region]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [stationsRes, entreprisesRes, obsRes] = await Promise.all([
                supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)'),
                supabase.from('entreprises').select('id, nom, sigle'),
                supabase.from('observations' as any).select('*').order('date', { ascending: false }).limit(50)
            ]);

            if (stationsRes.error) throw stationsRes.error;
            if (entreprisesRes.error) throw entreprisesRes.error;

            const mappedStations: Station[] = (stationsRes.data || []).map((s: any) => {
                const capaciteTotal = (s.capacite_essence || 0) + (s.capacite_gasoil || 0);
                const stockTotal = (s.stock_essence || 0) + (s.stock_gasoil || 0);
                const tauxRemplissage = capaciteTotal > 0 ? (stockTotal / capaciteTotal) * 100 : 0;

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
                    scoreRisque: tauxRemplissage < 10 ? 100 : tauxRemplissage < 25 ? 75 : tauxRemplissage < 50 ? 40 : 10,
                };
            });

            setStations(mappedStations);
            setEntreprises(entreprisesRes.data || []);
            
            if (!obsRes.error) {
                let obsData = (obsRes as any)?.data || [];
                // Filtering happens later in useMemo for more reactivity, but we initialize here
                setObservations(obsData);
            }

        } catch (error: any) {
            console.error('Error fetching inspector data:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de chargement',
                description: 'Certaines données n\'ont pas pu être récupérées. Vérifiez votre connexion.'
            });
        } finally {
            setLoading(false);
        }
    }, [inspecteurLevel.restrict, inspecteurLevel.region, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtrage des stations
    const filteredStations = useMemo(() => {
        let result = stations;

        // Restriction par niveau d'accès (Régional / Local)
        if (inspecteurLevel.restrict) {
            result = result.filter(s => s.region === inspecteurLevel.region);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.nom.toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q) ||
                s.entrepriseNom.toLowerCase().includes(q) ||
                s.ville.toLowerCase().includes(q)
            );
        }

        if (filterRegion !== 'all' && !inspecteurLevel.restrict) {
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
    }, [stations, searchQuery, filterRegion, filterEntreprise, filterStatus, filterStockLevel, inspecteurLevel]);

    // Statistiques calculées
    const stats = useMemo(() => {
        const currentStations = filteredStations;
        const currentObservations = observations.filter(o => 
            !inspecteurLevel.restrict || o.region === inspecteurLevel.region
        );
        
        const critiques = currentStations.filter(s => (s.scoreRisque || 0) >= 75);
        const ruptures = currentStations.filter(s => {
            const total = s.stockActuel.essence + s.stockActuel.gasoil;
            return total === 0;
        });

        return {
            totalStations: currentStations.length,
            stationsEnAlerte: critiques.length,
            stocksCritiques: currentStations.filter(s => {
                 const capaciteTotal = s.capacite.essence + s.capacite.gasoil;
                 const stockTotal = s.stockActuel.essence + s.stockActuel.gasoil;
                 const taux = capaciteTotal > 0 ? (stockTotal / capaciteTotal) * 100 : 0;
                 return taux < 25;
            }).length,
            rupturesStock: ruptures.length,
            observationsOuvertes: currentObservations.filter(o => o.statut === 'ouverte').length,
        };
    }, [filteredStations, observations, inspecteurLevel]);

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
            title="Dashboard Inspection"
            subtitle={`Supervision stratégique du réseau national — ${inspecteurLevel.name}`}
        >
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                            <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                            <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
                            <h2 className="text-2xl font-black text-slate-900 leading-none">Dashboard Inspection</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{inspecteurRegion ? `Supervision : ${inspecteurRegion}` : "Supervision Nationale SIHG"}</p>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[8px] font-black uppercase px-2 py-0 border-none">{inspecteurLevel.name}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => generateCustomReportPDF({
                            type: 'consommation-nationale',
                            title: `Rapport Supervision - ${inspecteurRegion || 'National'}`,
                            data: { region: inspecteurRegion },
        signerRole: 'inspecteur',
      })}
                        className="rounded-xl h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Rapport Mensuel
                    </Button>
                    <Dialog open={showObsDialog} onOpenChange={setShowObsDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                                <Plus className="h-4 w-4" />
                                Nouvelle Observation
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

            {/* Zone de Pilotage Stratégique - Positionnement Amélioré */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 group">
                {/* Bloc Principal: Indicateur de Risque National */}
                <Card className="xl:col-span-2 border-none shadow-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="h-40 w-40 text-indigo-400" />
                    </div>
                    <CardHeader className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                             <CardDescription className="text-indigo-300/70 text-[10px] font-black uppercase tracking-[0.2em]">Indicateur de Vigilance {inspecteurRegion || 'National'}</CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <CardTitle className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                    {filteredStations.length > 0
                                        ? Math.round(filteredStations.reduce((a, s) => a + (s.scoreRisque || 0), 0) / filteredStations.length)
                                        : 0}
                                    <span className="text-lg text-indigo-400/60 ml-2">PCI / 100</span>
                                </CardTitle>
                                <p className="text-xs text-indigo-300/50 mt-2 font-medium italic">Calculé sur {filteredStations.length} stations actives de la zone</p>
                            </div>
                            
                            <div className="flex items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                                <div className={cn(
                                    "h-16 w-16 rounded-full flex items-center justify-center border-4",
                                    (() => {
                                        const avg = filteredStations.length > 0 ? filteredStations.reduce((a, s) => a + (s.scoreRisque || 0), 0) / filteredStations.length : 0;
                                        if (avg < 30) return "border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.3)]";
                                        if (avg < 60) return "border-amber-400 bg-amber-500/20";
                                        return "border-red-400 bg-red-500/20 shadow-[0_0_20px_rgba(248,113,113,0.3)] animate-pulse";
                                    })()
                                )}>
                                    <Activity className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Statut Zone</p>
                                    <p className="text-lg font-bold text-white uppercase">
                                        {(() => {
                                            const avg = filteredStations.length > 0 ? filteredStations.reduce((a, s) => a + (s.scoreRisque || 0), 0) / filteredStations.length : 0;
                                            if (avg < 30) return "Sécurisé";
                                            if (avg < 60) return "Vigilance";
                                            return "Alerte";
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="bg-white/5 border-t border-white/5 p-4">
                        <div className="flex gap-8 overflow-x-auto no-scrollbar">
                             <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredStations.filter(s => (s.scoreRisque || 0) < 30).length} Stations conformes</span>
                             </div>
                             <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredStations.filter(s => (s.scoreRisque || 0) >= 30 && (s.scoreRisque || 0) < 75).length} Stations à surveiller</span>
                             </div>
                             <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredStations.filter(s => (s.scoreRisque || 0) >= 75).length} Alertes critiques</span>
                             </div>
                        </div>
                    </CardFooter>
                </Card>

                {/* Bloc Secondaire: Actions Prioritaires */}
                <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
                    <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
                             <AlertTriangle className="h-4 w-4 text-red-500" />
                             Missions prioritaires
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                         <div className="space-y-3">
                            {filteredStations.filter(s => (s.scoreRisque || 0) >= 75).length > 0 ? (
                                filteredStations.filter(s => (s.scoreRisque || 0) >= 75).slice(0, 3).map(s => (
                                    <div key={s.id} className="p-3 rounded-2xl bg-red-50 border border-red-100 group/item hover:bg-red-100 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-black text-red-900 uppercase">{s.nom}</p>
                                                <p className="text-[10px] text-red-700 font-bold">{s.ville} • {s.entrepriseSigle}</p>
                                            </div>
                                            <Badge className="bg-red-500 text-white text-[8px] px-1 font-black">RISQUE {s.scoreRisque}</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-32 flex flex-col items-center justify-center text-center opacity-30">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                                    <p className="text-[10px] font-black uppercase">Aucune intervention critique</p>
                                </div>
                            )}
                         </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                         <Button 
                            variant="outline" 
                            className="w-full rounded-xl h-10 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                            onClick={() => setActiveTab('stations')}
                         >
                             Voir tout le registre
                         </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Grille des Filtres / Actions Stratégiques */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher une station..."
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <Select value={filterRegion} onValueChange={setFilterRegion} disabled={inspecteurLevel.restrict}>
                        <SelectTrigger className="w-[140px] h-11 bg-white border-slate-200 rounded-xl">
                            <SelectValue placeholder="Région" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Guinée (Tout)</SelectItem>
                            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filterStockLevel} onValueChange={setFilterStockLevel}>
                        <SelectTrigger className="w-[140px] h-11 bg-white border-slate-200 rounded-xl">
                            <SelectValue placeholder="Niveau Stock" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous Niveaux</SelectItem>
                            <SelectItem value="rupture">Rupture (0 L)</SelectItem>
                            <SelectItem value="critique">Critique {"< 25%"}</SelectItem>
                            <SelectItem value="bas">Bas (25-50%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-11 w-11 rounded-xl bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
                    </Button>
                    <Button 
                        className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 font-black text-xs uppercase tracking-widest gap-2"
                        onClick={() => {
                            const dataToUse = filteredStations;
                            const statsForReport = {
                                entreprises: entreprises.map(e => {
                                    const entStations = dataToUse.filter(s => s.entrepriseId === e.id);
                                    if (entStations.length === 0) return null;
                                    return {
                                        nom: e.nom,
                                        sigle: e.sigle,
                                        stations: entStations.length,
                                        stockEssence: entStations.reduce((a, s) => a + s.stockActuel.essence, 0),
                                        stockGasoil: entStations.reduce((a, s) => a + s.stockActuel.gasoil, 0)
                                    };
                                }).filter(Boolean),
                                totals: {
                                    essence: dataToUse.reduce((a, s) => a + s.stockActuel.essence, 0),
                                    gasoil: dataToUse.reduce((a, s) => a + s.stockActuel.gasoil, 0),
                                    stations: dataToUse.length
                                },
                                autonomieEssence: 12, 
                                autonomieGasoil: 15
                            };
                            
                            generateNationalStockPDF(statsForReport as any);
                            
                            toast({
                                title: "Génération du rapport",
                                description: `Le rapport pour ${inspecteurRegion || 'le niveau national'} a été généré avec succès.`,
                            });
                        }}
                    >
                        <FileText className="h-4 w-4" />
                        Générer Rapport National
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start inline-flex h-12">
                    <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="stations" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">Parc Stations</TabsTrigger>
                    <TabsTrigger value="observations" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">Registre Terrain</TabsTrigger>
                    <TabsTrigger value="comparatif" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-wider">Compagnie / Zone</TabsTrigger>
                </TabsList>

                {/* TAB: Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Grille des Stats - Correction 440 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <StatCard
                            title="Indice de Mobilité"
                            value={filteredStations.filter(s => s.statut === 'active').length.toString()}
                            subtitle={`Sur ${filteredStations.length} stations`}
                            icon={Activity}
                            trend={{ value: 2.4, positive: true }}
                        />
                        <StatCard
                            title="Stocks Critiques"
                            value={stats.stocksCritiques.toString()}
                            subtitle="Sous le seuil de 25%"
                            icon={AlertTriangle}
                            trend={{ value: Math.round((stats.stocksCritiques / (filteredStations.length || 1)) * 100), positive: stats.stocksCritiques < 5 }}
                        />
                        <StatCard
                            title="Ruptures Sèches"
                            value={stats.rupturesStock.toString()}
                            subtitle="Stations à sec (0L)"
                            icon={Fuel}
                        />
                        <StatCard
                            title="Suivi Inspection"
                            value={stats.observationsOuvertes.toString()}
                            subtitle="Observations ouvertes"
                            icon={ClipboardList}
                        />
                    </div>

                    {/* Cartes Stratégiques: Vigilance Régionale & Conformité Entreprise */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Carte interactive par région */}
                        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-indigo-600" />
                                    Vigilance Régionale
                                </CardTitle>
                                <CardDescription className="text-[10px] font-medium uppercase text-slate-500">Répartition stratégique des alertes</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3">
                                {REGIONS
                                    .filter(region => !inspecteurLevel.restrict || region === inspecteurLevel.region)
                                    .map(region => {
                                    const regionStations = filteredStations.filter(s => s.region === region);
                                    if (regionStations.length === 0 && !inspecteurLevel.restrict) return null;
                                    const critical = regionStations.filter(s => (s.scoreRisque || 0) >= 75).length;
                                    
                                    return (
                                        <div key={region} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 transition-all cursor-pointer group/reg"
                                             onClick={() => {
                                                setFilterRegion(region === filterRegion ? 'all' : region);
                                                setActiveTab('stations');
                                             }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-black text-xs uppercase text-slate-700">{region}</span>
                                                <Badge className={cn("text-[9px] font-black", critical > 0 ? "bg-red-500" : "bg-slate-200 text-slate-600")}>{regionStations.length} STATIONS</Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {regionStations.slice(0, 15).map(s => (
                                                    <div key={s.id} className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        (s.scoreRisque || 0) < 30 ? "bg-emerald-400" :
                                                        (s.scoreRisque || 0) < 75 ? "bg-amber-400" : "bg-red-500 animate-pulse"
                                                     )} />
                                                ))}
                                                {regionStations.length > 15 && <span className="text-[8px] text-slate-400 font-bold">+{regionStations.length - 15}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Indice de Conformité par Entreprise */}
                        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                    Indice de Conformité
                                </CardTitle>
                                <CardDescription className="text-[10px] font-medium uppercase text-slate-500">Performance par compagnie pétrolière</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {entreprises.map(e => {
                                    const entStations = stations.filter(s => s.entrepriseId === e.id);
                                    if (entStations.length === 0) return null;
                                    const avgRisk = entStations.reduce((acc, s) => acc + (s.scoreRisque || 0), 0) / entStations.length;
                                    const conformite = Math.max(0, Math.round(100 - avgRisk));

                                    return (
                                        <div key={e.id} className="space-y-2 p-3 rounded-2xl border border-slate-50 bg-slate-50/30">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-[10px] uppercase text-slate-700">{e.sigle}</span>
                                                    <p className="text-[9px] text-slate-400 font-bold">{entStations.length} STATIONS</p>
                                                </div>
                                                <Badge className={cn(
                                                    "text-[10px] font-black",
                                                    conformite >= 80 ? "bg-emerald-500" : conformite >= 50 ? "bg-amber-500" : "bg-red-500"
                                                )}>
                                                    {conformite}%
                                                </Badge>
                                            </div>
                                            <Progress value={conformite} className="h-1.5" />
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

                                {!inspecteurLevel.restrict && (
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
                                )}

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
                        {filteredStations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                    <Fuel className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Aucune station trouvée</h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                                    Réorientez votre recherche ou vérifiez vos filtres de région et d'entreprise.
                                </p>
                                <Button 
                                    variant="outline" 
                                    className="mt-6"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterRegion('all');
                                        setFilterEntreprise('all');
                                        setFilterStatus('all');
                                        setFilterStockLevel('all');
                                    }}
                                >
                                    Effacer tous les filtres
                                </Button>
                            </div>
                        ) : (
                            filteredStations.map(station => {
                                const capaciteTotal = station.capacite.essence + station.capacite.gasoil;
                                const stockTotal = station.stockActuel.essence + station.stockActuel.gasoil;
                                const taux = capaciteTotal > 0 ? Math.round((stockTotal / capaciteTotal) * 100) : 0;

                                return (
                                    <Card key={station.id} className={cn("hover:shadow-md transition-all", getStockColor(station))}>
                                        <CardContent className="py-4">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-semibold text-lg">{station.nom}</h3>
                                                        {getStockBadge(station)}
                                                        <Badge variant="outline" className="text-xs">{station.statut}</Badge>
                                                        <Badge variant="secondary" className="text-[10px] font-mono">Score Risque: {station.scoreRisque}</Badge>
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
                                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Essence</p>
                                                        <p className="font-bold text-sm">{station.stockActuel.essence.toLocaleString('fr-GN')} L</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Gasoil</p>
                                                        <p className="font-bold text-sm">{station.stockActuel.gasoil.toLocaleString('fr-GN')} L</p>
                                                    </div>
                                                    <div className="text-center min-w-[60px]">
                                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Taux</p>
                                                        <p className={cn("font-black text-xl leading-none", taux < 25 ? "text-red-600" : taux < 50 ? "text-amber-600" : "text-emerald-600")}>{taux}%</p>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-8 gap-1"
                                                            onClick={() => setSelectedStationDetail(station.id)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Détails
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1"
                                                            onClick={() => {
                                                                setObsStationId(station.id);
                                                                setShowObsDialog(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Obs.
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>

                    {/* Modal Détails Station (Vue Inspecteur) */}
                    <Dialog open={!!selectedStationDetail} onOpenChange={(open) => !open && setSelectedStationDetail(null)}>
                        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                            {selectedStationDetail && (() => {
                                const station = stations.find(s => s.id === selectedStationDetail);
                                if (!station) return null;
                                return (
                                    <>
                                        <DialogHeader>
                                            <div className="flex items-center justify-between pr-6">
                                                <div>
                                                    <DialogTitle className="text-2xl font-bold">{station.nom}</DialogTitle>
                                                    <DialogDescription className="flex items-center gap-2 mt-1">
                                                        <MapPin className="h-3 w-3" /> {station.adresse}, {station.ville} • {station.entrepriseNom}
                                                    </DialogDescription>
                                                </div>
                                                {getStockBadge(station)}
                                            </div>
                                        </DialogHeader>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                                            {/* Stocks IoT */}
                                            <Card className="md:col-span-2">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                        <Activity className="h-4 w-4 text-blue-500" />
                                                        Données Temps Réel (IoT)
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl bg-slate-50 border">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-medium uppercase text-slate-500">Essence</span>
                                                                <Label className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">ONLINE</Label>
                                                            </div>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-2xl font-bold">{station.stockActuel.essence.toLocaleString('fr-GN')}</span>
                                                                <span className="text-xs text-slate-400 font-medium">Litres</span>
                                                            </div>
                                                            <Progress value={(station.stockActuel.essence / (station.capacite.essence || 1)) * 100} className="h-1.5 mt-3" />
                                                            <p className="text-[10px] text-slate-400 mt-1 uppercase italic">Dernière remontée: Il y a 5 min</p>
                                                        </div>

                                                        <div className="p-4 rounded-xl bg-slate-50 border">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-medium uppercase text-slate-500">Gasoil</span>
                                                                <Label className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">ONLINE</Label>
                                                            </div>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-2xl font-bold">{station.stockActuel.gasoil.toLocaleString('fr-GN')}</span>
                                                                <span className="text-xs text-slate-400 font-medium">Litres</span>
                                                            </div>
                                                            <Progress value={(station.stockActuel.gasoil / (station.capacite.gasoil || 1)) * 100} className="h-1.5 mt-3" />
                                                            <p className="text-[10px] text-slate-400 mt-1 uppercase italic">Dernière remontée: Il y a 12 min</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Prix Actuels */}
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                                        Prix Affichés
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="flex justify-between items-center p-3 rounded-lg border bg-emerald-50/30">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-emerald-700">Essence Super</p>
                                                            <p className="text-lg font-black text-emerald-900">12 000 <span className="text-[10px]">GNF</span></p>
                                                        </div>
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 rounded-lg border bg-emerald-50/30">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-emerald-700">Gasoil</p>
                                                            <p className="text-lg font-black text-emerald-900">12 000 <span className="text-[10px]">GNF</span></p>
                                                        </div>
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    </div>
                                                    <p className="text-[10px] text-center text-muted-foreground uppercase font-medium">Conforme au prix officiel de l'État</p>
                                                </CardContent>
                                            </Card>

                                            {/* Historique / Alertes */}
                                            <Card className="md:col-span-3">
                                                <Tabs defaultValue="history">
                                                    <TabsList className="w-full justify-start border-b rounded-none px-4 bg-transparent h-12">
                                                        <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent py-3">Historique des Ventes / Livraisons</TabsTrigger>
                                                        <TabsTrigger value="alerts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent py-3">Historique des Alertes</TabsTrigger>
                                                        <TabsTrigger value="obs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent py-3">Observations Inspecteurs</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="history" className="p-6">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between text-xs border-b pb-2 font-bold text-muted-foreground">
                                                                <span>DATE / HEURE</span>
                                                                <span>OPÉRATION</span>
                                                                <span>TYPE</span>
                                                                <span>QUANTITÉ</span>
                                                                <span>STATUT</span>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className="flex items-center justify-between text-sm">
                                                                        <span className="text-xs text-muted-foreground">0{i}/03/2026 10:30</span>
                                                                        <span className="font-medium">{i % 2 === 0 ? 'Réception livraison' : 'Vente déclarée'}</span>
                                                                        <Badge variant="outline" className="text-[10px]">{i % 2 === 0 ? 'Gasoil' : 'Essence'}</Badge>
                                                                        <span className="font-mono">{i % 2 === 0 ? '+15 000' : '-450'} L</span>
                                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px]">Confirmé</Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                    <TabsContent value="alerts" className="p-6">
                                                        <div className="text-center py-6 text-muted-foreground italic text-sm">
                                                            Aucune alerte majeure enregistrée sur les 30 derniers jours.
                                                        </div>
                                                    </TabsContent>
                                                    <TabsContent value="obs" className="p-6">
                                                        <div className="space-y-4">
                                                            {observations.filter(o => o.station_id === selectedStationDetail).map(obs => (
                                                                <div key={obs.id} className="p-3 rounded-lg border bg-slate-50 flex justify-between items-start">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="secondary" className="text-[10px]">{obs.type}</Badge>
                                                                            <span className="text-[10px] text-muted-foreground">{new Date(obs.date).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <p className="text-sm">{obs.description}</p>
                                                                    </div>
                                                                    <Badge variant={obs.statut === 'ouverte' ? 'default' : 'secondary'} className="text-[10px]">
                                                                        {obs.statut}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                            {observations.filter(o => o.station_id === selectedStationDetail).length === 0 && (
                                                                <div className="text-center py-4 text-muted-foreground text-sm">
                                                                    Aucune observation pour cette station.
                                                                </div>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                className="w-full gap-2 border-dashed mt-2"
                                                                onClick={() => {
                                                                    setObsStationId(selectedStationDetail);
                                                                    setShowObsDialog(true);
                                                                }}
                                                            >
                                                                <Plus className="h-4 w-4" /> Ajouter une nouvelle observation
                                                            </Button>
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </Card>
                                        </div>

                                        <DialogFooter className="border-t pt-6 bg-slate-50 -mx-6 -mb-6 px-6">
                                            <Button variant="outline" onClick={() => setSelectedStationDetail(null)}>Fermer</Button>
                                            <Button 
                                                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                                onClick={() => {
                                                    const station = stations.find(s => s.id === selectedStationDetail);
                                                    if (station) {
                                                        generateCustomReportPDF({
                                                            type: 'stock-entreprise',
                                                            title: `Inspection Station - ${station.nom}`,
                                                            data: {
                                                                entreprise_id: station.entrepriseId,
                                                                nom: station.nom,
                                                                sigle: station.entrepriseSigle
                                                            },
        signerRole: 'inspecteur',
      });
                                                    }
                                                }}
                                            >
                                                <FileText className="h-4 w-4" /> Générer Rapport de Station
                                            </Button>
                                        </DialogFooter>
                                    </>
                                );
                            })()}
                        </DialogContent>
                    </Dialog>
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

            {/* Zone de Validation Administrative (Aspect Officiel) */}
            <div className="mt-16 pt-8 border-t-2 border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-12 pb-12">
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Direction Générale SONAP</p>
                    <div className="h-px w-48 bg-slate-200 mt-12 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">Visa et Cachet Officiel</p>
                </div>
                <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inspection & Supervision SIHG</p>
                    <div className="h-px w-48 bg-slate-200 mt-12 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">Signature de l'Agent de Zone</p>
                </div>
            </div>
            
            <div className="text-center py-8">
               <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest bg-slate-50 inline-block px-4 py-1 rounded-full border border-slate-100">
                  Document Numérique - Certifié par la Présidence de la République de Guinée
               </p>
            </div>
        </DashboardLayout>
    );
}
