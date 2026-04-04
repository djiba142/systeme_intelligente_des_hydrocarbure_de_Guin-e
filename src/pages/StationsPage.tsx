import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, AlertTriangle, RefreshCw, Loader2, ChevronLeft, ChevronRight, Shield, Download, CheckCircle2, XCircle } from 'lucide-react';
import { generateExcelReport } from '@/lib/excelExport';
// ... other imports stay same, but ensure they are at the top
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StationCard } from '@/components/stations/StationCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS } from '@/lib/constants';
import { Station } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn, debounce } from '@/lib/utils';

// Import logos
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

const localLogoMapping: Record<string, string> = {
  TOTAL: logoTotal,
  TotalEnergies: logoTotal,
  TO: logoTotal,
  SHELL: logoShell,
  VIVO: logoShell,
  SH: logoShell,
  TMI: logoTMI,
  TM: logoTMI,
  KP: logoKP,
  'Kamsar Petroleum': logoKP,
  'KAMSAR PETROLEUM': logoKP,
};

const getLogoForEntreprise = (sigle: string, nom: string): string | null => {
  if (sigle && localLogoMapping[sigle]) return localLogoMapping[sigle];
  if (nom && localLogoMapping[nom]) return localLogoMapping[nom];

  if (nom) {
    const nomVariations = [
      nom.split('(')[0].trim(),
      nom.split('-')[0].trim(),
    ];
    for (const variation of nomVariations) {
      if (localLogoMapping[variation]) return localLogoMapping[variation];
    }
  }
  return null;
};



export default function StationsPage() {
  const { role: currentUserRole, profile: currentUserProfile, canManageStations } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isStationDialogOpen, setIsStationDialogOpen] = useState(false);
  const [savingStation, setSavingStation] = useState(false);

  // Pagination
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const [stationForm, setStationForm] = useState({
    nom: '',
    code: '',
    adresse: '',
    ville: '',
    region: '',
    type: 'urbaine' as 'urbaine' | 'routiere' | 'depot' | 'industrielle',
    entreprise_id: currentUserRole === 'responsable_entreprise' ? (currentUserProfile?.entreprise_id || '') : '',
    capacite_essence: 50000,
    capacite_gasoil: 50000,
    capacite_gpl: 0,
    capacite_lubrifiants: 0,
    nombre_cuves: 2,
    nombre_pompes: 4,
    latitude: 9.5092,
    longitude: -13.7122,
    gestionnaire_nom: '',
    gestionnaire_telephone: '',
    gestionnaire_email: '',
  });

  // Debounced search effect
  useEffect(() => {
    const debouncedUpdate = debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300);

    debouncedUpdate(searchQuery);
  }, [searchQuery]);

  // Fetch Entreprises (Cached)
  const { data: entreprises = [] } = useQuery({
    queryKey: ['entreprises-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entreprises')
        .select('id, nom, sigle')
        .order('nom');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch Stations (Cached & Optimized)
  const { data: stations = [], isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ['stations-list', currentUserRole, currentUserProfile?.entreprise_id],
    queryFn: async () => {
      let query = supabase.from('stations').select(`
        id, nom, code, adresse, ville, region, type, entreprise_id, 
        capacite_essence, capacite_gasoil, capacite_gpl, capacite_lubrifiants,
        stock_essence, stock_gasoil, stock_gpl, stock_lubrifiants,
        nombre_pompes, statut, 
        gestionnaire_nom, gestionnaire_telephone, gestionnaire_email,
        entreprise:entreprises!entreprise_id(nom, sigle, logo_url)
      `);

      if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id) {
        query = query.eq('entreprise_id', currentUserProfile.entreprise_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        nom: s.nom,
        code: s.code,
        adresse: s.adresse,
        ville: s.ville,
        region: s.region,
        type: s.type,
        entrepriseId: s.entreprise_id,
        entrepriseNom: s.entreprise?.nom || 'Inconnu',
        entrepriseSigle: s.entreprise?.sigle || '',
        entrepriseLogo: s.entreprise?.logo_url ?? getLogoForEntreprise(s.entreprise?.sigle || '', s.entreprise?.nom || ''),
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
          nom: s.gestionnaire_nom || 'Non assigné',
          telephone: s.gestionnaire_telephone || '',
          email: s.gestionnaire_email || '',
        },
        statut: s.statut,
      }));
    }
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedRegion, selectedEntreprise, activeTab]);

  const filteredStations = useMemo(() => {
    return stations.filter((s: any) => {
      const matchesSearch =
        s.nom.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesRegion = selectedRegion === 'all' || s.region === selectedRegion;
      const matchesEntreprise = selectedEntreprise === 'all' || s.entrepriseId === selectedEntreprise;

      if (activeTab === 'critical') {
        const essencePercent = s.capacite.essence > 0 ? Math.round((s.stockActuel.essence / s.capacite.essence) * 100) : 0;
        const gasoilPercent = s.capacite.gasoil > 0 ? Math.round((s.stockActuel.gasoil / s.capacite.gasoil) * 100) : 0;
        return matchesSearch && matchesRegion && matchesEntreprise && (essencePercent < 10 || gasoilPercent < 10);
      }
      if (activeTab === 'warning') {
        const essencePercent = s.capacite.essence > 0 ? Math.round((s.stockActuel.essence / s.capacite.essence) * 100) : 0;
        const gasoilPercent = s.capacite.gasoil > 0 ? Math.round((s.stockActuel.gasoil / s.capacite.gasoil) * 100) : 0;
        return matchesSearch && matchesRegion && matchesEntreprise &&
          ((essencePercent >= 10 && essencePercent < 25) || (gasoilPercent >= 10 && gasoilPercent < 25));
      }
      if (activeTab === 'pending') {
        return matchesSearch && matchesRegion && matchesEntreprise && s.statut === 'attente_validation';
      }

      return matchesSearch && matchesRegion && matchesEntreprise;
    });
  }, [stations, debouncedSearchQuery, selectedRegion, selectedEntreprise, activeTab]);

  // Paginated stations
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredStations.slice(start, end);
  }, [filteredStations, currentPage]);

  const totalPages = Math.ceil(filteredStations.length / ITEMS_PER_PAGE);

  const { criticalCount, warningCount, pendingCount } = useMemo(() => {
    const critical = stations.filter((s: any) => {
      const essencePercent = s.capacite.essence > 0 ? Math.round((s.stockActuel.essence / s.capacite.essence) * 100) : 0;
      const gasoilPercent = s.capacite.gasoil > 0 ? Math.round((s.stockActuel.gasoil / s.capacite.gasoil) * 100) : 0;
      return essencePercent < 10 || gasoilPercent < 10;
    }).length;

    const warning = stations.filter((s: any) => {
      const essencePercent = s.capacite.essence > 0 ? Math.round((s.stockActuel.essence / s.capacite.essence) * 100) : 0;
      const gasoilPercent = s.capacite.gasoil > 0 ? Math.round((s.stockActuel.gasoil / s.capacite.gasoil) * 100) : 0;
      return (essencePercent >= 10 && essencePercent < 25) || (gasoilPercent >= 10 && gasoilPercent < 25);
    }).length;

    const pending = stations.filter((s: any) => s.statut === 'attente_validation').length;

    return { criticalCount: critical, warningCount: warning, pendingCount: pending };
  }, [stations]);

  // useAuth provides canManageStations

  const handleExportExcel = async () => {
    if (filteredStations.length === 0) {
      toast({ title: 'Attention', description: 'Aucune donnée à exporter' });
      return;
    }

    try {
      const headers = ['Nom', 'Code', 'Région', 'Ville', 'Entreprise', 'Type', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Statut'];
      const data = filteredStations.map((s: any) => [
        s.nom,
        s.code,
        s.region,
        s.ville,
        s.entrepriseSigle || s.entrepriseNom,
        s.type.toUpperCase(),
        s.stockActuel.essence,
        s.stockActuel.gasoil,
        s.statut.toUpperCase()
      ]);

      await generateExcelReport({
        title: 'REPERTOIRE NATIONAL DES STATIONS-SERVICE - SIHG',
        filename: `Liste_Stations_SIHG_${new Date().toISOString().slice(0, 10)}`,
        headers,
        data,
        signerRole: currentUserRole || 'admin_etat',
        signerName: currentUserProfile?.full_name || 'Direction Nationale'
      });

      toast({ title: 'Succès', description: 'Le registre des stations a été exporté.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur Export', description: err.message });
    }
  };

  const handleSaveStation = async () => {
    const entrepriseId =
      currentUserRole === 'responsable_entreprise'
        ? currentUserProfile?.entreprise_id
        : stationForm.entreprise_id;

    const missing: string[] = [];
    if (!stationForm.nom?.trim()) missing.push('Nom');
    // Code is auto-generated by DB trigger — not required from the user
    if (!stationForm.adresse?.trim()) missing.push('Adresse');
    if (!stationForm.ville?.trim()) missing.push('Ville');
    if (!stationForm.region) missing.push('Région');
    if (!entrepriseId) missing.push('Entreprise');

    if (missing.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires manquants',
        description: `Veuillez remplir : ${missing.join(', ')}`,
      });
      return;
    }

    setSavingStation(true);

    try {
      const payload = {
        nom: stationForm.nom.trim(),
        // code is left empty so the DB trigger generates STA-YYYY-XXXX automatically
        code: stationForm.code.trim().toUpperCase() || '',
        adresse: stationForm.adresse.trim(),
        ville: stationForm.ville.trim(),
        region: stationForm.region,
        type: stationForm.type,
        entreprise_id: entrepriseId!,
        capacite_essence: Number(stationForm.capacite_essence) || 0,
        capacite_gasoil: Number(stationForm.capacite_gasoil) || 0,
        capacite_gpl: Number(stationForm.capacite_gpl) || 0,
        capacite_lubrifiants: Number(stationForm.capacite_lubrifiants) || 0,
        nombre_cuves: Number(stationForm.nombre_cuves) || 2,
        nombre_pompes: Number(stationForm.nombre_pompes) || 4,
        latitude: stationForm.latitude,
        longitude: stationForm.longitude,
        stock_essence: 0,
        stock_gasoil: 0,
        stock_gpl: 0,
        stock_lubrifiants: 0,
        statut: (['directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '')) ? 'attente_validation' : 'ouverte',
        gestionnaire_nom: stationForm.gestionnaire_nom?.trim() || null,
        gestionnaire_telephone: stationForm.gestionnaire_telephone?.trim() || null,
        gestionnaire_email: stationForm.gestionnaire_email?.trim() || null,
      };

      const { error } = await supabase.from('stations').insert(payload);

      if (error) throw error;

      toast({
        title: (['directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '')) ? 'Demande envoyée' : 'Succès',
        description: (['directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '')) 
          ? `${stationForm.nom} a été créée et est en attente de validation par l'Administration Centrale.` 
          : `${stationForm.nom} (${stationForm.code}) a été créée`,
      });

      setIsStationDialogOpen(false);
      setStationForm({
        nom: '',
        code: '',
        adresse: '',
        ville: '',
        region: '',
        type: 'urbaine' as 'urbaine' | 'routiere' | 'depot' | 'industrielle',
        entreprise_id: '',
        capacite_essence: 50000,
        capacite_gasoil: 50000,
        capacite_gpl: 0,
        capacite_lubrifiants: 0,
        nombre_cuves: 2,
        nombre_pompes: 4,
        latitude: 9.5092,
        longitude: -13.7122,
        gestionnaire_nom: '',
        gestionnaire_telephone: '',
        gestionnaire_email: '',
      });

      await fetchData();
    } catch (err: any) {
      console.error('Erreur création station :', err);
      toast({
        variant: 'destructive',
        title: 'Échec création',
        description: err?.message || 'Une erreur est survenue lors de la création.',
      });
    } finally {
      setSavingStation(false);
    }
  };

  const handleValidateStation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stations')
        .update({ statut: 'ouverte' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Station validée', description: 'La station est maintenant ouverte et active.' });
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const handleRejectStation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stations')
        .update({ statut: 'fermee' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Demande rejetée', description: 'La création de la station a été rejetée.' });
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const isAdminCentral = ['super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint'].includes(currentUserRole || '');

  const openStationDialog = () => {
    setStationForm(prev => ({
      ...prev,
      entreprise_id: prev.entreprise_id,
      region: prev.region || REGIONS[0] || '',
    }));
    setIsStationDialogOpen(true);
  };

  return (
    <DashboardLayout title="Stations-service" subtitle="Surveillance des stocks en temps réel">
      <div className="flex justify-between items-center mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all">Toutes ({stations.length})</TabsTrigger>
            <TabsTrigger value="critical" className="text-red-600 data-[state=active]:text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Critiques ({criticalCount})
            </TabsTrigger>
            <TabsTrigger value="warning" className="text-amber-600 data-[state=active]:text-amber-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Alertes ({warningCount})
            </TabsTrigger>
            {(['super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '')) && (
              <TabsTrigger value="pending" className="text-blue-600 data-[state=active]:text-blue-600 font-bold">
                 <Shield className="h-4 w-4 mr-1" />
                 À Valider ({pendingCount})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 ml-4">
          {canManageStations && (
            <Button size="sm" onClick={openStationDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle station
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les régions</SelectItem>
            {REGIONS.map(region => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(currentUserRole === 'super_admin' || currentUserRole === 'admin_etat' || currentUserRole === 'directeur_general' || currentUserRole === 'directeur_adjoint') && (
          <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Entreprise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entreprises</SelectItem>
              {entreprises.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.sigle || e.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Chargement des stations...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedStations.map(station => (
              <div key={station.id} className="relative">
                <StationCard station={station} />
                {station.statut === 'attente_validation' && isAdminCentral && (
                  <div className="flex gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleValidateStation(station.id);
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1 font-bold text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRejectStation(station.id);
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredStations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Aucune station trouvée</p>
              <p className="text-sm">Modifiez vos critères ou créez-en une nouvelle</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page <span className="font-semibold">{currentPage}</span> sur <span className="font-semibold">{totalPages}</span>
                ({filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-9 h-9 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={isStationDialogOpen} onOpenChange={setIsStationDialogOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Nouvelle station-service</DialogTitle>
            <DialogDescription>
              Renseignez les informations principales de la station.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Nom de la station *</Label>
              <Input
                value={stationForm.nom}
                onChange={(e) => setStationForm({ ...stationForm, nom: e.target.value })}
                placeholder="Ex: Station Kipé"
              />
            </div>

            {/* Code — Auto-généré par le système */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Code Station
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                  ⚡ Auto
                </span>
              </Label>
              <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <span className="text-sm font-mono font-bold tracking-widest">STA-{new Date().getFullYear()}-XXXX</span>
                <span className="text-[10px] text-slate-400 italic">· Généré automatiquement à la création</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adresse complète *</Label>
              <Input
                value={stationForm.adresse}
                onChange={(e) => setStationForm({ ...stationForm, adresse: e.target.value })}
                placeholder="Ex: Avenue de la République, Kipé"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <SelectValue placeholder="Choisir une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de station</Label>
                <Select
                  value={stationForm.type}
                  onValueChange={(v: any) =>
                    setStationForm({ ...stationForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urbaine">Urbaine</SelectItem>
                    <SelectItem value="routiere">Routière</SelectItem>
                    <SelectItem value="depot">Dépôt / Entrepôt</SelectItem>
                    <SelectItem value="industrielle">Industrielle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(currentUserRole === 'super_admin' || currentUserRole === 'admin_etat') && (
                <div className="space-y-2">
                  <Label>Entreprise *</Label>
                  <Select
                    value={stationForm.entreprise_id}
                    onValueChange={(v) => setStationForm({ ...stationForm, entreprise_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir l'entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      {entreprises.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.sigle || e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude (GPS)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={stationForm.latitude}
                  onChange={(e) => setStationForm({ ...stationForm, latitude: parseFloat(e.target.value) })}
                  placeholder="9.50921"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude (GPS)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={stationForm.longitude}
                  onChange={(e) => setStationForm({ ...stationForm, longitude: parseFloat(e.target.value) })}
                  placeholder="-13.7122"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Essence (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_essence || ''}
                  onChange={(e) => setStationForm({...stationForm, capacite_essence: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Gasoil (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_gasoil || ''}
                  onChange={(e) => setStationForm({...stationForm, capacite_gasoil: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">GPL (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_gpl || ''}
                  onChange={(e) => setStationForm({...stationForm, capacite_gpl: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Lubrif. (L)</Label>
                <Input
                  type="number"
                  value={stationForm.capacite_lubrifiants || ''}
                  onChange={(e) => setStationForm({...stationForm, capacite_lubrifiants: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de Pompes</Label>
                <Input
                  type="number"
                  value={stationForm.nombre_pompes}
                  onChange={(e) => setStationForm({...stationForm, nombre_pompes: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de Cuves</Label>
                <Input
                  type="number"
                  value={stationForm.nombre_cuves}
                  onChange={(e) => setStationForm({...stationForm, nombre_cuves: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label>Gestionnaire de la station (optionnel)</Label>
              <Input
                placeholder="Nom complet du gestionnaire"
                value={stationForm.gestionnaire_nom}
                onChange={(e) => setStationForm({ ...stationForm, gestionnaire_nom: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Téléphone"
                  value={stationForm.gestionnaire_telephone}
                  onChange={(e) => setStationForm({ ...stationForm, gestionnaire_telephone: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  value={stationForm.gestionnaire_email}
                  onChange={(e) => setStationForm({ ...stationForm, gestionnaire_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-6 -mb-6 px-6 pb-6 border-t">
            <Button variant="outline" onClick={() => setIsStationDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveStation} disabled={savingStation}>
              {savingStation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Créer la station'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}