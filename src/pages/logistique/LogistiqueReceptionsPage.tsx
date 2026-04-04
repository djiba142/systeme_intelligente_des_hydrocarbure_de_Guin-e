import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Search, Ship, CheckCircle2, Warehouse, ClipboardCheck, Clock, Loader2, ArrowDownCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export default function LogistiqueReceptionsPage() {
  const { role, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch verified receptions (historical)
  const { data: receptions, isLoading } = useQuery({
    queryKey: ['logistique-receptions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('logistique_receptions')
        .select(`
          *, 
          depot:logistique_depots(nom), 
          cargaison:import_cargaisons(
            quantite_reelle, 
            navire:import_navires(nom), 
            dossier:import_dossiers(numero_dossier, produit:import_produits(nom))
          )
        `)
        .order('date_reception', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch pending transfers from Port to this user's visible depots
  const { data: pendingTransfers } = useQuery({
    queryKey: ['pending-transfers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('depot_transfers')
        .select(`
          *, 
          depot:logistique_depots(nom),
          cargaison:import_cargaisons(
            id, 
            navire:import_navires(nom), 
            dossier:import_dossiers(numero_dossier, produit:import_produits(nom))
          )
        `)
        .eq('status', 'en_transfert');

      if (error) throw error;
      return data || [];
    }
  });

  const confirmReceptionMutation = useMutation({
    mutationFn: async (vars: any) => {
      // 1. Create the official reception record (Triggers stock update)
      const { error: receptionError } = await (supabase as any).from('logistique_receptions').insert({
        cargaison_id: vars.cargaison_id,
        depot_id: vars.depot_id,
        quantite_recue: vars.quantite_recue,
        recu_par: user?.id,
        observations: vars.observations
      });
      if (receptionError) throw receptionError;

      // 2. Mark the transfer as complete
      const { error: transferError } = await (supabase as any).from('depot_transfers')
        .update({ status: 'complete' })
        .eq('id', vars.transfer_id);
      if (transferError) throw transferError;

      // 3. Update global cargaison status
      const { error: cargaisonError } = await (supabase as any).from('import_cargaisons')
        .update({ statut: 'stocke' })
        .eq('id', vars.cargaison_id);
      if (cargaisonError) throw cargaisonError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistique-receptions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['logistique-depots'] });
      setIsDialogOpen(false);
      toast({ title: "Stockage confirmé", description: "Le produit a été intégré au stock du dépôt avec succès." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    }
  });

  const canConfirm = role === 'responsable_depots' || role === 'super_admin' || role === 'directeur_logistique';

  return (
    <DashboardLayout 
      title="Réception & Mise en Stock Dépôts" 
      subtitle="Confirmation de l'arrivée des cargaisons transférées du port vers les dépôts de stockage."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Chercher une réception..." 
              className="pl-10 h-10 border-none bg-slate-50 rounded-xl" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              {canConfirm && (
                <Button className="h-10 px-6 rounded-xl gap-2 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
                  <ArrowDownCircle className="h-4 w-4" /> Enregistrer une Arrivée
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 leading-tight">Confirmation de Réception <br/><span className="text-blue-600">Entrée en Dépôt</span></DialogTitle>
                <DialogDescription>Validez la quantité finale reçue au dépôt pour mettre à jour les stocks nationaux.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4 pt-4" onSubmit={(e) => { 
                e.preventDefault(); 
                const fd = new FormData(e.currentTarget); 
                const transferId = fd.get('transfer') as string;
                const transfer = pendingTransfers?.find((t: any) => t.id === transferId);

                confirmReceptionMutation.mutate({ 
                  transfer_id: transferId,
                  cargaison_id: transfer?.cargaison_id, 
                  depot_id: transfer?.depot_id, 
                  quantite_recue: Number(fd.get('quantite')), 
                  observations: fd.get('notes') 
                }); 
              }}>
                <div className="space-y-2">
                  <Label>Transfert en attente</Label>
                  <Select name="transfer" required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Choisir un convoi à l'arrivée..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingTransfers?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.cargaison.navire.nom} → {t.depot.nom} ({t.quantity} T)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1.5 mb-1">
                    <Ship className="h-3 w-3" /> Information Produit
                  </p>
                  <p className="text-xs font-semibold text-slate-600 ml-4.5 italic">
                    Sélectionnez un transfert pour voir les volumes expédiés du port.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Quantité Réceptionnée (Tonnes)</Label>
                  <Input 
                    name="quantite" 
                    type="number" 
                    placeholder="Saisir la mesure du dépôt" 
                    required 
                    className="h-12 rounded-xl" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Observations / Scellés</Label>
                  <Input 
                    name="notes" 
                    placeholder="Remarques éventuelles sur la livraison" 
                    className="h-12 rounded-xl" 
                  />
                </div>
                
                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold" disabled={confirmReceptionMutation.isPending}>
                    {confirmReceptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirmer l'Entrée en Stock"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-xl overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Horodatage</TableHead>
                <TableHead className="font-bold text-slate-900">Navire / Convoi</TableHead>
                <TableHead className="font-bold text-slate-900">Produit</TableHead>
                <TableHead className="font-bold text-slate-900">Volume Dépôt</TableHead>
                <TableHead className="font-bold text-slate-900">Destination</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 font-bold text-slate-300 animate-pulse">Synchronisation avec les dépôts...</TableCell></TableRow>
              ) : receptions?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Aucune réception enregistrée dans les dépôts.</TableCell></TableRow>
              ) : receptions?.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{new Date(r.date_reception).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.date_reception).toLocaleTimeString()}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-blue-600 flex items-center gap-1.5"><Ship className="h-3.5 w-3.5" /> {r.cargaison?.navire?.nom}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{r.cargaison?.dossier?.numero_dossier}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 font-black text-[9px] uppercase">
                      {r.cargaison?.dossier?.produit?.nom}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-black text-slate-900">{Number(r.quantite_recue).toLocaleString()} MT</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600 font-medium whitespace-nowrap">
                      <Warehouse className="h-4 w-4 text-emerald-500" /> {r.depot?.nom}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3">STOCKÉ</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}

