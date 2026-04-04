import { useState, useMemo, useEffect } from 'react';
import {
  Gauge, Plus, Search, Filter, CheckCircle2, XCircle, Clock,
  AlertTriangle, TrendingUp, ChevronRight, Building2, RefreshCw,
  Eye, Edit, Trash2, Send, Loader2, FileSearch, Calendar, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Quota, WorkflowStatus } from '@/types/regulation';

const STATUT_CONFIG: Record<WorkflowStatus, { label: string; color: string; icon: typeof Clock }> = {
  en_analyse: { label: 'En Analyse', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  propose: { label: 'Proposition', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Send },
  valide: { label: 'Validé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejete: { label: 'Rejeté', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  publie: { label: 'Publié', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
};

const PRODUIT_LABELS: Record<string, string> = {
  essence: 'Essence Super',
  gasoil: 'Gasoil / Diesel',
  jet_a1: 'Jet A-1',
  gpl: 'GPL',
};

export default function QuotasPage() {
  const { role, user, profile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterProduit, setFilterProduit] = useState<string>('all');
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [entreprises, setEntreprises] = useState<{id: string; nom: string; sigle: string}[]>([]);

  // New quota form
  const [newEntrepriseId, setNewEntrepriseId] = useState('');
  const [newProduit, setNewProduit] = useState('gasoil');
  const [newQuantite, setNewQuantite] = useState('');
  const [newPeriode, setNewPeriode] = useState('');
  const [creating, setCreating] = useState(false);

  const isAdmin = role === 'admin_central' || role === 'super_admin';
  const isChef = role === 'chef_regulation';
  const isAnalyste = role === 'analyste_regulation';

  const fetchEntreprises = async () => {
    const { data } = await supabase.from('entreprises').select('id, nom, sigle').order('nom');
    if (data) setEntreprises(data);
  };

  const fetchQuotas = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('regulation_quotas')
        .select(`*, entreprises (nom, sigle, logo_url)`)
        .order('created_at', { ascending: false });

      if (role === 'responsable_entreprise' && profile?.entreprise_id) {
        query = query.eq('entreprise_id', profile.entreprise_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((q: any) => ({
        ...q,
        entreprise_nom: q.entreprises?.nom || 'Inconnu',
        entreprise_sigle: q.entreprises?.sigle || '?',
        entreprise_logo: q.entreprises?.logo_url,
      }));
      setQuotas(mapped);
    } catch (err: any) {
      console.error('Error fetching quotas:', err);
      setQuotas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
    fetchEntreprises();
    // Set default period to current month
    const now = new Date();
    setNewPeriode(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const handleCreate = async () => {
    if (!newEntrepriseId || !newQuantite) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await (supabase as any).from('regulation_quotas').insert({
        entreprise_id: newEntrepriseId,
        produit: newProduit,
        quantite: parseFloat(newQuantite),
        quantite_utilisee: 0,
        periode: newPeriode,
        statut: 'en_analyse',
        propose_par: user?.id,
      });
      if (error) throw error;
      toast({ title: "Quota créé", description: `Quota de ${parseInt(newQuantite).toLocaleString()} L attribué.` });
      setIsCreateOpen(false);
      setNewEntrepriseId('');
      setNewQuantite('');
      fetchQuotas();
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
      if (newStatut === 'propose') updateData.propose_par = user?.id;
      if (newStatut === 'valide') updateData.valide_par = user?.id;
      if (newStatut === 'publie') updateData.publie_par = user?.id;

      const { error } = await (supabase as any)
        .from('regulation_quotas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Statut mis à jour", description: `Le quota a été passé au statut : ${STATUT_CONFIG[newStatut].label}` });
      
      await (supabase as any).from('regulation_logs').insert({
        user_id: user?.id,
        action: `Mise à jour statut quota: ${newStatut}`,
        module: 'quotas',
        details: { quota_id: id, new_statut: newStatut }
      });

      fetchQuotas();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de mettre à jour le statut.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return quotas.filter(q => {
      const matchSearch = q.entreprise_nom.toLowerCase().includes(search.toLowerCase()) || q.entreprise_sigle?.toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === 'all' || q.statut === filterStatut;
      const matchProduit = filterProduit === 'all' || q.produit === filterProduit;
      return matchSearch && matchStatut && matchProduit;
    });
  }, [quotas, search, filterStatut, filterProduit]);

  const statsByStatus = useMemo(() => ({
    en_analyse: quotas.filter(q => q.statut === 'en_analyse').length,
    propose: quotas.filter(q => q.statut === 'propose').length,
    valide: quotas.filter(q => q.statut === 'valide').length,
    publie: quotas.filter(q => q.statut === 'publie').length,
    rejete: quotas.filter(q => q.statut === 'rejete').length,
  }), [quotas]);

  return (
    <DashboardLayout title="Gestion des Quotas" subtitle="Régulation nationale — Attribution et contrôle des quotas pétroliers">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {(Object.entries(STATUT_CONFIG) as [WorkflowStatus, typeof STATUT_CONFIG[WorkflowStatus]][]).map(([key, config]) => (
          <Card key={key} className={cn("border-none shadow-sm cursor-pointer transition-all hover:shadow-md",
            filterStatut === key ? 'ring-2 ring-primary' : '')}
            onClick={() => setFilterStatut(filterStatut === key ? 'all' : key)}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.color)}>
                <config.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black">{statsByStatus[key]}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">{config.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher une entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterProduit} onValueChange={setFilterProduit}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les produits" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            <SelectItem value="essence">Essence</SelectItem>
            <SelectItem value="gasoil">Gasoil</SelectItem>
            <SelectItem value="jet_a1">Jet A-1</SelectItem>
            <SelectItem value="gpl">GPL</SelectItem>
          </SelectContent>
        </Select>
        {(isAdmin || isChef) && (
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-lg shadow-red-600/20"
          >
            <Plus className="h-4 w-4" />
            {isAdmin ? 'Fixer un Quota' : 'Proposer un Quota'}
          </Button>
        )}
      </div>

      {/* Quotas list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gauge className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aucun quota trouvé</p>
            {(isAdmin || isChef) && <p className="text-sm text-slate-400 mt-1">Cliquez « Fixer un Quota » pour en créer un.</p>}
          </div>
        ) : filtered.map(q => {
          const pct = q.quantite > 0 ? Math.round((q.quantite_utilisee / q.quantite) * 100) : 0;
          const config = STATUT_CONFIG[q.statut];
          return (
            <Card key={q.id} className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-black text-sm shadow-sm overflow-hidden">
                      {(q as any).entreprise_logo ? (
                        <img src={(q as any).entreprise_logo} alt={q.entreprise_sigle} className="h-full w-full object-cover" />
                      ) : (
                        q.entreprise_sigle || '??'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{q.entreprise_nom}</h3>
                      <p className="text-xs text-slate-500">{PRODUIT_LABELS[q.produit] || q.produit} — Période : {q.periode}</p>
                    </div>
                  </div>
                  <div className="flex-1 w-full md:w-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">
                        {q.quantite_utilisee.toLocaleString()} / {q.quantite.toLocaleString()} L
                      </span>
                      <span className={cn("text-xs font-bold", pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-emerald-600')}>
                        {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <Badge className={cn("border text-[10px] uppercase font-bold", config.color)}>
                    {config.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {isAdmin && q.statut === 'propose' && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => handleStatusUpdate(q.id, 'valide')} disabled={updatingId === q.id}>
                          {updatingId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Valider
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-700 hover:bg-red-50 gap-1"
                          onClick={() => handleStatusUpdate(q.id, 'rejete')} disabled={updatingId === q.id}>
                          <XCircle className="h-3 w-3" /> Rejeter
                        </Button>
                      </>
                    )}
                    {isAdmin && q.statut === 'valide' && (
                      <Button size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 gap-1"
                        onClick={() => handleStatusUpdate(q.id, 'publie')} disabled={updatingId === q.id}>
                        {updatingId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Publier
                      </Button>
                    )}
                    {isChef && q.statut === 'en_analyse' && (
                      <Button size="sm" variant="outline" className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                        onClick={() => handleStatusUpdate(q.id, 'propose')} disabled={updatingId === q.id}>
                        {updatingId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Proposer
                      </Button>
                    )}
                  </div>
                </div>
                {q.statut === 'rejete' && q.motif_rejet && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-xs text-red-700"><strong>Motif du rejet :</strong> {q.motif_rejet}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Quota Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Fixer un Quota</DialogTitle>
            <DialogDescription>Attribuer un quota de produit pétrolier à une entreprise</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Entreprise</Label>
              <Select value={newEntrepriseId} onValueChange={setNewEntrepriseId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {entreprises.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} ({e.sigle})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Produit</Label>
                <Select value={newProduit} onValueChange={setNewProduit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essence">Essence</SelectItem>
                    <SelectItem value="gasoil">Gasoil</SelectItem>
                    <SelectItem value="jet_a1">Jet A-1</SelectItem>
                    <SelectItem value="gpl">GPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Période</Label>
                <Input type="month" value={newPeriode} onChange={(e) => setNewPeriode(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Quantité (Litres)</Label>
              <Input type="number" placeholder="Ex: 500000" value={newQuantite} onChange={(e) => setNewQuantite(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-red-600 hover:bg-red-700 gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Attribuer le Quota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
