import { useState, useMemo, useEffect } from 'react';
import {
  Award, Plus, Search, CheckCircle2, XCircle, Clock,
  Eye, FileText, Send, Building2, Calendar, ShieldCheck, 
  RefreshCw, Loader2, PenTool, Printer, FileSearch
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Agrement, WorkflowStatus, AgrementType } from '@/types/regulation';

const STATUT_CONFIG: Record<WorkflowStatus, { label: string; color: string }> = {
  en_analyse: { label: 'En Analyse', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  propose: { label: 'Proposé', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  valide: { label: 'Validé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejete: { label: 'Rejeté', color: 'bg-red-100 text-red-700 border-red-200' },
  publie: { label: 'Signé & Publié', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const TYPE_LABELS: Record<AgrementType, { label: string; color: string }> = {
  importation: { label: 'Importation', color: 'bg-indigo-100 text-indigo-700' },
  distribution: { label: 'Distribution', color: 'bg-emerald-100 text-emerald-700' },
  stockage: { label: 'Stockage', color: 'bg-amber-100 text-amber-700' },
  transport: { label: 'Transport', color: 'bg-blue-100 text-blue-700' },
};

export default function AgrementsPage() {
  const { role, user, profile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [agrements, setAgrements] = useState<Agrement[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [entreprises, setEntreprises] = useState<{id: string; nom: string; sigle: string}[]>([]);

  // New agrement form
  const [newEntrepriseId, setNewEntrepriseId] = useState('');
  const [newType, setNewType] = useState<string>('distribution');
  const [creating, setCreating] = useState(false);

  const isAdmin = role === 'admin_central' || role === 'super_admin';
  const isChef = role === 'chef_regulation';

  const fetchEntreprises = async () => {
    const { data } = await supabase.from('entreprises').select('id, nom, sigle').order('nom');
    if (data) setEntreprises(data);
  };

  const fetchAgrements = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('regulation_agrements')
        .select(`*, entreprises (nom, sigle, logo_url)`)
        .order('created_at', { ascending: false });

      if (role === 'responsable_entreprise' && profile?.entreprise_id) {
        query = query.eq('entreprise_id', profile.entreprise_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((a: any) => ({
        ...a,
        entreprise_nom: a.entreprises?.nom || 'Inconnu',
        entreprise_sigle: a.entreprises?.sigle || '?',
        entreprise_logo: a.entreprises?.logo_url,
      }));
      setAgrements(mapped);
    } catch (err: any) {
      console.error('Error fetching agrements:', err);
      setAgrements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgrements();
    fetchEntreprises();
  }, []);

  const handleCreate = async () => {
    if (!newEntrepriseId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une entreprise.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const numero = `AGR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const { error } = await (supabase as any).from('regulation_agrements').insert({
        entreprise_id: newEntrepriseId,
        numero,
        type_agrement: newType,
        statut: 'en_analyse',
      });
      if (error) throw error;
      toast({ title: "Agrément créé", description: `N° ${numero} en cours d'analyse.` });
      setIsCreateOpen(false);
      setNewEntrepriseId('');
      setNewType('distribution');
      fetchAgrements();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatut: WorkflowStatus) => {
    setUpdatingId(id);
    try {
      const updateData: any = { statut: newStatut, updated_at: new Date().toISOString() };
      if (newStatut === 'valide' || newStatut === 'publie') updateData.signe_par = user?.id;

      const { error } = await (supabase as any)
        .from('regulation_agrements')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: "Statut mis à jour", 
        description: `L'agrément est maintenant : ${STATUT_CONFIG[newStatut].label}` 
      });
      
      await (supabase as any).from('regulation_logs').insert({
        user_id: user?.id,
        action: `Mise à jour statut agrément: ${newStatut}`,
        module: 'agrements',
        details: { agrement_id: id, new_statut: newStatut }
      });

      fetchAgrements();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de mettre à jour le statut.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return agrements.filter(a => {
      const matchSearch = (a.entreprise_nom?.toLowerCase() || '').includes(search.toLowerCase()) || (a.numero?.toLowerCase() || '').includes(search.toLowerCase());
      const matchStatut = filterStatut === 'all' || a.statut === filterStatut;
      return matchSearch && matchStatut;
    });
  }, [agrements, search, filterStatut]);

  return (
    <DashboardLayout title="Gestion des Agréments" subtitle="Régulation nationale — Délivrance et suivi des agréments pétroliers">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-8">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher par entreprise ou numéro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            Nouvel Agrément
          </Button>
        )}
      </div>

      {/* Agréments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aucun agrément trouvé</p>
            {isAdmin && <p className="text-sm text-slate-400 mt-2">Cliquez « Nouvel Agrément » pour en créer un.</p>}
          </div>
        ) : filtered.map(a => {
          const statutConfig = STATUT_CONFIG[a.statut];
          const typeConfig = TYPE_LABELS[a.type_agrement];
          return (
            <Card key={a.id} className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{a.entreprise_nom}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">N° {a.numero}</p>
                  </div>
                  <Badge className={cn("text-[10px] uppercase border font-bold", typeConfig?.color || 'bg-slate-100')}>
                    {typeConfig?.label || a.type_agrement}
                  </Badge>
                  {a.date_emission && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {a.date_emission} → {a.date_expiration}
                    </div>
                  )}
                  <Badge className={cn("text-[10px] uppercase border font-bold", statutConfig?.color || 'bg-slate-100')}>
                    {statutConfig?.label || a.statut}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {a.document_url && (
                      <Button 
                        size="sm" variant="ghost" 
                        className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        onClick={() => window.open(a.document_url!, '_blank')}
                      >
                        <FileSearch className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && a.statut === 'en_analyse' && (
                      <Button 
                        size="sm" variant="outline" 
                        className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                        onClick={() => handleStatusUpdate(a.id, 'propose')}
                        disabled={updatingId === a.id}
                      >
                        {updatingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Proposer
                      </Button>
                    )}
                    {isAdmin && a.statut === 'propose' && (
                      <>
                        <Button 
                          size="sm" variant="outline" 
                          className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => handleStatusUpdate(a.id, 'publie')}
                          disabled={updatingId === a.id}
                        >
                          {updatingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} Signer
                        </Button>
                        <Button 
                          size="sm" variant="outline" 
                          className="text-xs border-red-200 text-red-700 hover:bg-red-50 gap-1"
                          onClick={() => handleStatusUpdate(a.id, 'rejete')}
                          disabled={updatingId === a.id}
                        >
                          <XCircle className="h-3 w-3" /> Rejeter
                        </Button>
                      </>
                    )}
                    {isChef && a.statut === 'en_analyse' && (
                      <Button 
                        size="sm" variant="outline" 
                        className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                        onClick={() => handleStatusUpdate(a.id, 'propose')}
                        disabled={updatingId === a.id}
                      >
                        {updatingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Valider Tech.
                      </Button>
                    )}
                    {(a.statut === 'publie' || a.statut === 'valide') && (
                      <Button size="sm" variant="outline" className="text-xs border-slate-200 gap-1">
                        <Printer className="h-3 w-3" /> Imprimer
                      </Button>
                    )}
                  </div>
                </div>
                {a.statut === 'rejete' && a.motif_rejet && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-xs text-red-700"><strong>Motif :</strong> {a.motif_rejet}</p>
                  </div>
                )}
                {a.signe_par && (
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Signé par {a.signe_par}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Agrement Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Nouvel Agrément</DialogTitle>
            <DialogDescription>Créer un nouvel agrément pour une entreprise pétrolière</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Entreprise</Label>
              <Select value={newEntrepriseId} onValueChange={setNewEntrepriseId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une entreprise..." /></SelectTrigger>
                <SelectContent>
                  {entreprises.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} ({e.sigle})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Type d'agrément</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="distribution">Distribution</SelectItem>
                  <SelectItem value="importation">Importation</SelectItem>
                  <SelectItem value="stockage">Stockage</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer l'agrément
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
