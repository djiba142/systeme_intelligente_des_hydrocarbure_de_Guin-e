import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ClipboardList, Search, Filter, Plus, FileText, 
  MapPin, Clock, CheckCircle2, AlertTriangle, RefreshCw,
  Eye, Building2, Fuel, Shield
} from 'lucide-react';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { REGIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Inspection {
  id: string;
  station_id: string;
  station_nom: string;
  inspecteur_id: string;
  inspecteur_nom?: string;
  type: string;
  description: string;
  date: string;
  statut: 'ouverte' | 'traitee';
  region: string;
  notes_admin?: string;
  created_at: string;
}

const OBSERVATION_TYPES = [
  { value: 'conformite', label: 'Contrôle de Conformité' },
  { value: 'stock_verif', label: 'Vérification des Stocks' },
  { value: 'prix_officiel', label: 'Contrôle des Prix' },
  { value: 'panne', label: 'Panne Technique' },
  { value: 'fraude', label: 'Suspicion de Fraude' },
  { value: 'autre', label: 'Autre' },
];

export default function InspectionsPage() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Create state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { canAddObservation, canModifyData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    station_id: '',
    type: 'conformite',
    description: '',
  });

  const fetchStations = async () => {
    const { data } = await supabase.from('stations').select('id, nom, region, ville');
    setStations(data || []);
  };

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      // Re-fetch inspections with a more resilient query
        const { data, error } = await (supabase as any)
        .from('observations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
           console.warn('Observations fetch error:', error);
           toast({
             title: "Erreur de données",
             description: "Impossible de charger le registre des inspections.",
             variant: "destructive"
           });
           setInspections([]);
           return;
      }

      const profilesRes = await supabase.from('profiles').select('user_id, full_name');
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));

      setInspections((data || []).map((item: any) => ({
        ...item,
        inspecteur_nom: profileMap.get(item.inspecteur_id) || item.inspecteur_id?.slice(0, 8) || 'Inconnu'
      })));
    } catch (error) {
      console.error('Critical error fetching inspections:', error);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      fetchInspections();
      fetchStations();
      isFirstLoad.current = false;
    }
  }, [fetchInspections]);

  const handleCreate = async () => {
    if (!form.station_id || !form.description.trim()) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez sélectionner une station et fournir une description.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedStation = stations.find(s => s.id === form.station_id);
      
      const { error } = await (supabase as any).from('observations').insert({
        station_id: form.station_id,
        station_nom: selectedStation?.nom || '',
        inspecteur_id: user?.id,
        type: form.type,
        description: form.description,
        date: new Date().toISOString(),
        statut: 'ouverte',
        region: selectedStation?.region || '',
      });

      if (error) throw error;

      toast({
        title: "Rapport enregistré",
        description: "Votre rapport d'inspection a été ajouté avec succès."
      });
      
      setIsDialogOpen(false);
      setForm({ station_id: '', type: 'conformite', description: '' });
      fetchInspections();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le rapport.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const testLiaison = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase as any).from('observations').insert({
        station_id: 'test',
        station_nom: 'Test System',
        inspecteur_id: user?.id,
        type: 'autre',
        description: 'Test de liaison système @ ' + new Date().toISOString(),
        date: new Date().toISOString(),
        statut: 'traitee',
        region: 'Conakry',
      });
      
      if (error) {
           toast({
             title: "Échec du test",
             description: "La table 'observations' n'existe probablement pas encore.",
             variant: "destructive"
           });
      } else {
           toast({
             title: "Liaison établie",
             description: "Le système est prêt à recevoir les rapports d'inspection.",
           });
           fetchInspections();
      }
    } catch (err) {
      toast({
        title: "Erreur critique",
        description: "Impossible d'accéder à la base de données.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInspections = inspections.filter(ins => {
    const sNom = ins.station_nom || "";
    const sDesc = ins.description || "";
    const matchesSearch = 
      sNom.toLowerCase().includes(searchTerm.toLowerCase()) || 
      sDesc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = filterRegion === "all" || ins.region === filterRegion;
    const matchesType = filterType === "all" || ins.type === filterType;
    return matchesSearch && matchesRegion && matchesType;
  });

  const formatSafeDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "-" : d.toLocaleDateString('fr-FR');
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (statut: string) => {
    return statut === 'ouverte' 
      ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">Ouverte</Badge>
      : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Traitée</Badge>;
  };

  const getTypeLabel = (type: string) => {
    return OBSERVATION_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout 
      title="Missions d'Inspection" 
      subtitle="Registre national des contrôles et observations sur le terrain"
    >
      <div className="space-y-6">
        {/* Actions & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une mission..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes régions</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {OBSERVATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {canAddObservation && (
              <Button variant="outline" size="sm" onClick={testLiaison} disabled={loading} className="gap-2 border-primary/20 hover:border-primary/50 text-xs font-bold">
                 {loading ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Shield className="h-3 w-3 text-primary"/>}
                 Tester Liaison
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={fetchInspections} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            
            {canAddObservation && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Plus className="h-4 w-4" />
                    Nouveau Rapport
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Créer un Rapport d'Inspection</DialogTitle>
                    <DialogDescription>
                      Enregistrez les détails de votre visite terrain
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Station Inspectée *</Label>
                      <Select value={form.station_id} onValueChange={(v) => setForm({...form, station_id: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une station" />
                        </SelectTrigger>
                        <SelectContent>
                          {stations.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nom} ({s.ville})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type d'Inspection *</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OBSERVATION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Observations Détaillées *</Label>
                      <Textarea 
                        placeholder="Décrivez les anomalies, les mesures de prix, les niveaux de stock vérifiés..."
                        className="h-32"
                        value={form.description}
                        onChange={(e) => setForm({...form, description: e.target.value})}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreate} disabled={submitting}>
                      {submitting ? 'Enregistrement...' : 'Enregistrer le Rapport'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Inspections List */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Date & Inspecteur</TableHead>
                  <TableHead>Station / Région</TableHead>
                  <TableHead>Type de Mission</TableHead>
                  <TableHead className="max-w-[300px]">Observations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 opacity-20" />
                      Chargement des missions...
                    </TableCell>
                  </TableRow>
                ) : filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Aucun rapport d'inspection trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((ins) => (
                    <TableRow key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatSafeDate(ins.date)}
                          </span>
                          <span className="text-xs text-muted-foreground">{ins.inspecteur_nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{ins.station_nom}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ins.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                          {getTypeLabel(ins.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs line-clamp-2">{ins.description}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(ins.statut)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
