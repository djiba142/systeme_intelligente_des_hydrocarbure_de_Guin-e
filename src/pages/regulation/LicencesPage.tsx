import { useState, useMemo, useEffect } from 'react';
import {
  ScrollText, Plus, Search, CheckCircle2, XCircle, Clock,
  Eye, Calendar, ShieldCheck, AlertTriangle, RefreshCw, Ban, RotateCcw,
  Loader2, FileSearch
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import type { Licence, LicenceType } from '@/types/regulation';

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  suspendue: { label: 'Suspendue', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Ban },
  expiree: { label: 'Expirée', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  annulee: { label: 'Annulée', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: XCircle },
};

const TYPE_LABELS: Record<LicenceType, string> = {
  exploitation: 'Exploitation',
  distribution: 'Distribution',
  importation: 'Importation',
  transport: 'Transport',
};

export default function LicencesPage() {
  const { role, user, profile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [licences, setLicences] = useState<Licence[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [entreprises, setEntreprises] = useState<{id: string; nom: string; sigle: string}[]>([]);

  // New licence form
  const [newEntrepriseId, setNewEntrepriseId] = useState('');
  const [newType, setNewType] = useState<string>('exploitation');
  const [creating, setCreating] = useState(false);

  const isAdmin = role === 'admin_central' || role === 'super_admin';

  const fetchEntreprises = async () => {
    const { data } = await supabase.from('entreprises').select('id, nom, sigle').order('nom');
    if (data) setEntreprises(data);
  };

  const fetchLicences = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('regulation_licences')
        .select(`*, entreprises (nom, sigle, logo_url)`)
        .order('created_at', { ascending: false });

      if (role === 'responsable_entreprise' && profile?.entreprise_id) {
        query = query.eq('entreprise_id', profile.entreprise_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((l: any) => ({
        ...l,
        entreprise_nom: l.entreprises?.nom || 'Inconnu',
        entreprise_sigle: l.entreprises?.sigle || '?',
        entreprise_logo: l.entreprises?.logo_url,
      }));
      setLicences(mapped);
    } catch (err: any) {
      console.error('Error fetching licences:', err);
      setLicences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicences();
    fetchEntreprises();
  }, []);

  const handleCreate = async () => {
    if (!newEntrepriseId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une entreprise.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const numero = `LIC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const now = new Date();
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);

      const { error } = await (supabase as any).from('regulation_licences').insert({
        entreprise_id: newEntrepriseId,
        numero,
        titre: newType,
        statut: 'active',
        date_emission: now.toISOString().split('T')[0],
        date_expiration: expiry.toISOString().split('T')[0],
        signe_par: user?.id,
      });
      if (error) throw error;
      toast({ title: "Licence délivrée", description: `Licence N° ${numero} créée avec succès.` });
      setIsCreateOpen(false);
      setNewEntrepriseId('');
      setNewType('exploitation');
      fetchLicences();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatut: string) => {
    setUpdatingId(id);
    try {
      const { error } = await (supabase as any)
        .from('regulation_licences')
        .update({ statut: newStatut, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Statut mis à jour", description: `La licence est maintenant : ${STATUT_CONFIG[newStatut]?.label || newStatut}` });
      
      await (supabase as any).from('regulation_logs').insert({
        user_id: user?.id,
        action: `Mise à jour statut licence: ${newStatut}`,
        module: 'licences',
        details: { licence_id: id, new_statut: newStatut }
      });

      fetchLicences();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de mettre à jour.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return licences.filter(l => {
      const matchSearch = (l.entreprise_nom?.toLowerCase() || '').includes(search.toLowerCase()) || (l.numero?.toLowerCase() || '').includes(search.toLowerCase());
      const matchStatut = filterStatut === 'all' || l.statut === filterStatut;
      return matchSearch && matchStatut;
    });
  }, [licences, search, filterStatut]);

  const getDaysUntilExpiry = (dateStr: string) => {
    const now = new Date();
    const expiry = new Date(dateStr);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <DashboardLayout title="Gestion des Licences" subtitle="Régulation nationale — Délivrance, renouvellement et suspension des licences">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Object.entries(STATUT_CONFIG).map(([key, config]) => {
          const count = licences.filter(l => l.statut === key).length;
          return (
            <Card key={key} className={cn("border-none shadow-sm cursor-pointer transition-all hover:shadow-md",
              filterStatut === key ? 'ring-2 ring-primary' : '')}
              onClick={() => setFilterStatut(filterStatut === key ? 'all' : key)}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", config.color)}>
                  <config.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black">{count}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher par entreprise ou numéro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            Délivrer une Licence
          </Button>
        )}
      </div>

      {/* Licences list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aucune licence trouvée</p>
            {isAdmin && <p className="text-sm text-slate-400 mt-2">Cliquez « Délivrer une Licence » pour en créer une.</p>}
          </div>
        ) : filtered.map(l => {
          const statutConfig = STATUT_CONFIG[l.statut];
          const daysLeft = getDaysUntilExpiry(l.date_expiration);
          const isExpiringSoon = l.statut === 'active' && daysLeft > 0 && daysLeft <= 90;
          return (
            <Card key={l.id} className={cn("border-none shadow-sm hover:shadow-md transition-all", isExpiringSoon && "ring-1 ring-amber-300")}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
                      {(l as any).entreprise_logo ? (
                        <img src={(l as any).entreprise_logo} alt={l.entreprise_nom} className="h-full w-full object-cover" />
                      ) : (
                        l.entreprise_sigle || 'LI'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{l.entreprise_nom}</h3>
                      <p className="text-xs text-slate-500">N° {l.numero} — {TYPE_LABELS[l.type_licence] || l.type_licence}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {l.date_emission} → {l.date_expiration}
                  </div>
                  {isExpiringSoon && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] uppercase border">
                      ⚠ Expire dans {daysLeft}j
                    </Badge>
                  )}
                  <Badge className={cn("text-[10px] uppercase border font-bold", statutConfig?.color || 'bg-slate-100')}>
                    {statutConfig?.label || l.statut}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {l.document_url && (
                      <Button size="sm" variant="ghost"
                        className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        onClick={() => window.open(l.document_url!, '_blank')}>
                        <FileSearch className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && l.statut === 'active' && (
                      <Button size="sm" variant="outline" className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                        onClick={() => handleStatusUpdate(l.id, 'suspendue')} disabled={updatingId === l.id}>
                        {updatingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} Suspendre
                      </Button>
                    )}
                    {isAdmin && (l.statut === 'expiree' || l.statut === 'suspendue') && (
                      <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                        onClick={() => handleStatusUpdate(l.id, 'active')} disabled={updatingId === l.id}>
                        {updatingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Renouveler
                      </Button>
                    )}
                  </div>
                </div>
                {l.delivre_par && (
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Délivrée par {l.delivre_par}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Licence Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Délivrer une Licence</DialogTitle>
            <DialogDescription>Attribuer une licence d'exploitation pétrolière</DialogDescription>
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
              <Label className="text-xs font-bold uppercase tracking-widest">Type de licence</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exploitation">Exploitation</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                  <SelectItem value="importation">Importation</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Délivrer la Licence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
