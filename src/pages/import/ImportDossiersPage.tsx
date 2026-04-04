import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FolderOpen, Plus, Search, Filter, Calendar, Ship, 
  ArrowRight, FileText, CheckCircle2, Clock, 
  ShieldCheck, Wallet, Truck, Anchor, XCircle, Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ImportDossier {
  id: string;
  numero_dossier: string;
  statut: string;
  quantite_prevue: number;
  port_depart: string | null;
  port_arrivee: string | null;
  date_arrivee_est: string;
  created_at: string;
  updated_at: string;
  fournisseur: { nom: string; pays: string } | null;
  produit: { nom: string } | null;
}

interface SupplierRef { id: string; nom: string; }
interface ProductRef { id: string; nom: string; }

interface NewDossier {
  numero_dossier: string;
  fournisseur_id: string;
  produit_id: string;
  quantite_prevue: number;
  port_depart: string | null;
  date_arrivee_est: string;
  statut: string;
}

interface StatusUpdate {
  id: string;
  status: string;
  updates?: Record<string, string | null>;
}

const db = supabase;

export default function ImportDossiersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: currentUserRole, user } = useAuth();

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ['import-dossiers-workflow'],
    queryFn: async () => {
      const { data, error } = await db
        .from('import_dossiers')
        .select(`
          *,
          fournisseur:import_fournisseurs(nom, pays),
          produit:import_produits(nom)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ImportDossier[]) || [];
    }
  });

  const { data: suppliers } = useQuery({
    queryKey: ['import-fournisseurs-list'],
    queryFn: async () => {
      const { data } = await db.from('import_fournisseurs').select('id, nom').eq('statut', 'actif');
      return (data as SupplierRef[]) || [];
    }
  });

  const { data: products } = useQuery({
    queryKey: ['import-produits-list'],
    queryFn: async () => {
      const { data } = await db.from('import_produits').select('id, nom');
      return (data as ProductRef[]) || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newDossier: NewDossier) => {
      const { error } = await db
        .from('import_dossiers')
        .insert({ 
          ...newDossier, 
          created_by: user?.id 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-dossiers-workflow'] });
      toast({ title: "Dossier créé", description: "Le dossier d'importation est maintenant en préparation." });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: error.message || "Impossible de créer le dossier." 
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, updates = {} }: StatusUpdate) => {
      const { error } = await db
        .from('import_dossiers')
        .update({ statut: status, ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-dossiers-workflow'] });
      toast({ 
        title: "Statut mis à jour", 
        description: `Le dossier est passé au statut : ${variables.status.replace('_', ' ')}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erreur de mise à jour", 
        description: error.message || "Impossible de changer le statut du dossier." 
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_preparation': 
        return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 uppercase text-[9px] font-black">1. Préparation</Badge>;
      case 'attente_juridique': 
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black animate-pulse">2. Vérification AC</Badge>;
      case 'en_transport': 
        return <Badge className="bg-blue-500 text-white border-none uppercase text-[9px] font-black">3. En Transport</Badge>;
      case 'arrive': 
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black">4. Arrivé Port</Badge>;
      case 'receptionne': 
        return <Badge className="bg-emerald-600 text-white border-none uppercase text-[9px] font-black">5. Réceptionné</Badge>;
      case 'rejete': 
        return <Badge className="bg-red-100 text-red-700 border-red-200 uppercase text-[9px] font-black">Rejeté</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isRole = (roles: AppRole[]) => currentUserRole && roles.includes(currentUserRole);

  const handleAction = (dossier: ImportDossier) => {
    const { id, statut } = dossier;

    // 1. Logistique/Import submits to Admin Central
    if (statut === 'en_preparation' && isRole(['directeur_importation', 'agent_importation', 'directeur_aval', 'technicien_flux'])) {
      updateStatusMutation.mutate({ id, status: 'attente_juridique' });
      return;
    }

    // 2. Admin Central Approves (leads directly to transport)
    if (statut === 'attente_juridique' && isRole(['admin_etat', 'directeur_general', 'directeur_adjoint', 'secretaire_general', 'super_admin'])) {
      updateStatusMutation.mutate({ 
        id, 
        status: 'en_transport', 
        updates: { valide_juridique_par: user?.id || null, valide_juridique_at: new Date().toISOString() } 
      });
      return;
    }

    // 4. Logistique confirms arrival
    if (statut === 'en_transport' && isRole(['directeur_aval', 'technicien_flux', 'super_admin'])) {
      updateStatusMutation.mutate({ id, status: 'arrive' });
      return;
    }

    // 5. Finalize reception
    if (statut === 'arrive' && isRole(['directeur_aval', 'technicien_flux', 'super_admin'])) {
      updateStatusMutation.mutate({ id, status: 'receptionne' });
      return;
    }

    toast({ title: "Action non autorisée", description: "Vous n'avez pas le rôle requis pour cette étape du workflow.", variant: "destructive" });
  };

  const filteredDossiers = dossiers?.filter((d: ImportDossier) => 
    d.numero_dossier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.fournisseur?.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout 
      title="Workflow Importation Pétrolière" 
      subtitle="Supervision du flux d'approvisionnement national SONAP — Importation vers Stockage"
    >
      <div className="space-y-6 animate-fade-in">
        
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Revue Légale</p>
                  <h4 className="text-xl font-black">{dossiers?.filter((d: ImportDossier) => d.statut === 'attente_juridique').length || 0}</h4>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dossiers Clôturés</p>
                  <h4 className="text-xl font-black">{dossiers?.filter((d: ImportDossier) => d.statut === 'receptionne').length || 0}</h4>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Ship className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navires en Mer</p>
                  <h4 className="text-xl font-black">{dossiers?.filter((d: ImportDossier) => d.statut === 'en_transport').length || 0}</h4>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 border-emerald-200">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Truck className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Réceptionnés (Mois)</p>
                  <h4 className="text-xl font-black">{dossiers?.filter((d: ImportDossier) => d.statut === 'receptionne').length || 0}</h4>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher par n° de dossier ou fournisseur..." 
                className="pl-10 h-12 bg-white rounded-2xl border-slate-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" className="h-12 w-12 rounded-2xl bg-white border border-slate-100"><Filter size={18} /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              {isRole(['directeur_importation', 'agent_importation', 'directeur_aval', 'super_admin']) && (
                <Button className="h-12 px-8 rounded-2xl gap-3 shadow-xl shadow-primary/20 bg-primary font-black uppercase text-[10px] tracking-widest">
                  <Plus className="h-4 w-4" /> Initialiser un Dossier
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl p-8 overflow-hidden">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Ouvrir un Dossier d'Importation National</DialogTitle>
                <DialogDescription className="font-medium">Étape 1 : Saisie initiale par la Direction Logistique / Importation</DialogDescription>
              </DialogHeader>
              <form className="grid grid-cols-2 gap-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                if (!selectedSupplier || !selectedProduct) {
                  toast({ variant: "destructive", title: "Champs manquants", description: "Veuillez sélectionner un fournisseur et un produit." });
                  return;
                }

                const quantite = Number(formData.get('quantite'));
                if (isNaN(quantite) || quantite <= 0) {
                  toast({ variant: "destructive", title: "Quantité invalide", description: "Veuillez saisir une quantité positive." });
                  return;
                }

                createMutation.mutate({
                  numero_dossier: formData.get('numero') as string,
                  fournisseur_id: selectedSupplier,
                  produit_id: selectedProduct,
                  quantite_prevue: quantite,
                  port_depart: formData.get('port_depart') as string,
                  date_arrivee_est: formData.get('date_prevue') as string,
                  statut: 'en_preparation'
                });
              }}>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Référence Dossier</Label>
                  <Input name="numero" placeholder="IMP-2026-XXXX" required className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Trader International</Label>
                  <Select onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                      <SelectValue placeholder="Sélectionner le fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.length === 0 && <div className="p-2 text-xs text-slate-500">Aucun fournisseur actif</div>}
                      {suppliers?.map((s: SupplierRef) => (
                        <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Type de Produit</Label>
                  <Select onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                      <SelectValue placeholder="Produit importé" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.length === 0 && <div className="p-2 text-xs text-slate-500">Aucun produit configuré</div>}
                      {products?.map((p: ProductRef) => (
                        <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Quantité (Tonnes)</Label>
                  <Input name="quantite" type="number" placeholder="0.00" required className="h-12 rounded-xl border-slate-200 font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Port d'Origine</Label>
                  <Input name="port_depart" placeholder="Ex: Amsterdam, Singapour..." className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Date d'Arrivée Estimée (ETA)</Label>
                  <Input name="date_prevue" type="date" required className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="col-span-2 space-y-2 border-t pt-4 mt-2">
                   <p className="text-[10px] font-bold text-slate-500 italic mb-2">Note : Le dossier sera crée au statut "En préparation" et devra être soumis au service Juridique.</p>
                </div>
                <DialogFooter className="col-span-2">
                   <Button type="submit" className="w-full h-14 rounded-2xl mt-2 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Générer & Ouvrir le Dossier Stratégique"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workflow Lifecycle Table */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-xl">
          <Table>
            <TableHeader className="bg-slate-900 border-none">
              <TableRow className="hover:bg-slate-900">
                <TableHead className="font-black text-white px-8 py-5 uppercase text-[10px] tracking-widest">N° Dossier</TableHead>
                <TableHead className="font-black text-white px-6 uppercase text-[10px] tracking-widest">Produit & Volume</TableHead>
                <TableHead className="font-black text-white px-6 uppercase text-[10px] tracking-widest">Trader & Pays</TableHead>
                <TableHead className="font-black text-white px-6 uppercase text-[10px] tracking-widest">Étape Workflow</TableHead>
                <TableHead className="font-black text-white px-6 uppercase text-[10px] tracking-widest">Port d'arrivée</TableHead>
                <TableHead className="font-black text-white px-6 uppercase text-[10px] tracking-widest">Calendrier ETA</TableHead>
                <TableHead className="text-right font-black text-white px-8 uppercase text-[10px] tracking-widest">Actions Requises</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" size={40} /></TableCell></TableRow>
              ) : filteredDossiers?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs">Aucun dossier trouvé.</TableCell></TableRow>
              ) : filteredDossiers?.map((d: ImportDossier) => {
                
                // Determine action button text and function based on status and role
                let actionBtnLabel = "Détails";
                let actionBtnIcon = <ArrowRight className="h-4 w-4" />;
                let actionBtnVariant: "outline" | "default" | "secondary" | "destructive" | "ghost" = "ghost";
                let showAction = true;

                if (d.statut === 'en_preparation' && isRole(['directeur_importation', 'agent_importation', 'directeur_aval'])) {
                  actionBtnLabel = "Soumettre au Juridique";
                  actionBtnIcon = <ShieldCheck className="h-4 w-4" />;
                  actionBtnVariant = "outline";
                } else if (d.statut === 'attente_juridique' && isRole(['admin_etat', 'directeur_administratif', 'directeur_general', 'directeur_adjoint'])) {
                  actionBtnLabel = "Valider Contrat";
                  actionBtnIcon = <CheckCircle2 className="h-4 w-4" />;
                  actionBtnVariant = "default";
                } else if (d.statut === 'en_transport' && isRole(['directeur_aval', 'technicien_flux'])) {
                  actionBtnLabel = "Confirmer Arrivée";
                  actionBtnIcon = <Anchor className="h-4 w-4" />;
                  actionBtnVariant = "secondary";
                } else if (d.statut === 'arrive' && isRole(['directeur_aval', 'technicien_flux'])) {
                  actionBtnLabel = "Certifier Réception";
                  actionBtnIcon = <CheckCircle2 className="h-4 w-4" />;
                  actionBtnVariant = "default";
                } else if (d.statut === 'receptionne') {
                  showAction = false;
                }

                return (
                  <TableRow key={d.id} className="hover:bg-slate-50 transition-all border-b border-slate-100 group">
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                           <FolderOpen className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="font-black text-slate-900 uppercase tracking-tighter">{d.numero_dossier}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {d.id.slice(0,8)}</p>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <p className="font-black text-slate-700 uppercase text-xs">{d.produit?.nom}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{Number(d.quantite_prevue).toLocaleString()} <span className="text-[10px] text-slate-400">T</span></p>
                    </TableCell>
                    <TableCell className="px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <p className="font-bold text-slate-600 uppercase text-[10px]">{d.fournisseur?.nom}</p>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 italic mt-0.5">{d.fournisseur?.pays}</p>
                    </TableCell>
                    <TableCell className="px-6">
                      <div className="space-y-1.5">
                        {getStatusBadge(d.statut)}
                        <div className="flex gap-1">
                           <div className={cn("h-1 flex-1 rounded-full", (d.statut !== 'en_preparation' && d.statut !== 'rejete') ? 'bg-emerald-500' : 'bg-slate-200')}></div>
                           <div className={cn("h-1 flex-1 rounded-full", (['attente_paiement', 'en_transport', 'arrive', 'receptionne'].includes(d.statut)) ? 'bg-emerald-500' : 'bg-slate-200')}></div>
                           <div className={cn("h-1 flex-1 rounded-full", (['en_transport', 'arrive', 'receptionne'].includes(d.statut)) ? 'bg-emerald-500' : 'bg-slate-200')}></div>
                           <div className={cn("h-1 flex-1 rounded-full", (['arrive', 'receptionne'].includes(d.statut)) ? 'bg-emerald-500' : 'bg-slate-200')}></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <p className="font-bold text-slate-600 text-[10px] uppercase tracking-tighter">{d.port_arrivee || 'Port de Conakry'}</p>
                    </TableCell>
                    <TableCell className="px-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 w-fit">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-black text-slate-700">{new Date(d.date_arrivee_est).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 text-right">
                      {showAction ? (
                        <Button 
                          variant={actionBtnVariant} 
                          size="sm" 
                          className={cn(
                            "h-10 rounded-xl gap-2 px-6 font-black uppercase text-[9px] tracking-widest transition-all",
                            actionBtnVariant === "default" && "bg-slate-900 border-none shadow-lg shadow-slate-900/10"
                          )}
                          onClick={() => handleAction(d)}
                          disabled={updateStatusMutation.isPending}
                        >
                          {updateStatusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : actionBtnIcon}
                          {actionBtnLabel}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="h-10 px-4 rounded-xl text-emerald-600 bg-emerald-50 border-emerald-100 font-black uppercase text-[9px] gap-2">
                          <CheckCircle2 size={12} /> Terminé & Archivé
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Informational Workflow Help */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 mb-10">
            <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4"><ShieldCheck size={18} /></div>
              <p className="text-[10px] font-black uppercase text-indigo-900 mb-2">Responsabilité Juridique</p>
              <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">Vérification de la validité du contrat trader, de la licence d'importation et de la police d'assurance cargaison.</p>
           </div>
           <div className="p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4"><Anchor size={18} /></div>
              <p className="text-[10px] font-black uppercase text-blue-900 mb-2">Transit Maritime</p>
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">Suivi en temps réel des navires en mer, ETA et coordination avec les autorités portuaires.</p>
           </div>
           <div className="p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4"><Truck size={18} /></div>
              <p className="text-[10px] font-black uppercase text-blue-900 mb-2">Responsabilité Logistique</p>
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">Tracking du navire via AIS, confirmation de l'accostage et transfert physique vers les bacs du dépôt central.</p>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
