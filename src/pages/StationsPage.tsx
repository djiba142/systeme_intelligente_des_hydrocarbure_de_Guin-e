import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, AlertTriangle, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();
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
    type: 'urbaine' as 'urbaine' | 'routiere' | 'depot',
    entreprise_id: '',
    capacite_essence: 50000,
    capacite_gasoil: 50000,
    capacite_gpl: 0,
    capacite_lubrifiants: 0,
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

  const { criticalCount, warningCount } = useMemo(() => {
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

    return { criticalCount: critical, warningCount: warning };
  }, [stations]);

  const canCreateStation =
    currentUserRole === 'super_admin' ||
    (currentUserRole === 'responsable_entreprise' && !!currentUserProfile?.entreprise_id);

  const handleSaveStation = async () => {
    const entrepriseId =
      currentUserRole === 'responsable_entreprise'
        ? currentUserProfile?.entreprise_id
        : stationForm.entreprise_id;

    const missing: string[] = [];
    if (!stationForm.nom?.trim()) missing.push('Nom');
    if (!stationForm.code?.trim()) missing.push('Code');
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
        code: stationForm.code.trim().toUpperCase(),
        adresse: stationForm.adresse.trim(),
        ville: stationForm.ville.trim(),
        region: stationForm.region,
        type: stationForm.type,
        entreprise_id: entrepriseId!,
        capacite_essence: Number(stationForm.capacite_essence) || 0,
        capacite_gasoil: Number(stationForm.capacite_gasoil) || 0,
        capacite_gpl: 0,
        capacite_lubrifiants: 0,
        stock_essence: 0,
        stock_gasoil: 0,
        stock_gpl: 0,
        stock_lubrifiants: 0,
        statut: 'ouverte',
        gestionnaire_nom: stationForm.gestionnaire_nom?.trim() || null,
        gestionnaire_telephone: stationForm.gestionnaire_telephone?.trim() || null,
        gestionnaire_email: stationForm.gestionnaire_email?.trim() || null,
      };

      const { error } = await supabase.from('stations').insert(payload);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `${stationForm.nom} (${stationForm.code}) a été créée`,
      });

      setIsStationDialogOpen(false);
      setStationForm({
        nom: '',
        code: '',
        adresse: '',
        ville: '',
        region: '',
        type: 'urbaine',
        entreprise_id: '',
        capacite_essence: 50000,
        capacite_gasoil: 50000,
        capacite_gpl: 0,
        capacite_lubrifiants: 0,
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

  const openStationDialog = () => {
    setStationForm(prev => ({
      ...prev,
      entreprise_id: currentUserRole === 'responsable_entreprise' ? (currentUserProfile?.entreprise_id || '') : prev.entreprise_id,
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
          </TabsList>
        </Tabs>

        <div className="flex gap-2 ml-4">
          {canCreateStation && (
            <Button size="sm" onClick={openStationDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle station
            </Button>
          )}
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

        {currentUserRole === 'super_admin' && (
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
              <StationCard key={station.id} station={station} />
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

            <div className="space-y-2">
              <Label>Code unique *</Label>
              <Input
                value={stationForm.code}
                onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })}
                placeholder="Ex: CON-001"
              />
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

            <div className="space-y-2">
              <Label>Type de station</Label>
              <Select
                value={stationForm.type}
                onValueChange={(v: 'urbaine' | 'routiere' | 'depot') =>
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
                </SelectContent>
              </Select>
            </div>

            {currentUserRole === 'super_admin' && (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacité essence (litres)</Label>
                <Input
                  type="number"
                  min="0"
                  value={stationForm.capacite_essence || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStationForm({
                      ...stationForm,
                      capacite_essence: val === '' ? 0 : Number(val),
                    });
                  }}
                  placeholder="Ex: 50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacité gasoil (litres)</Label>
                <Input
                  type="number"
                  min="0"
                  value={stationForm.capacite_gasoil || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStationForm({
                      ...stationForm,
                      capacite_gasoil: val === '' ? 0 : Number(val),
                    });
                  }}
                  placeholder="Ex: 50000"
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