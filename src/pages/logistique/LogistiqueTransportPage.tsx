import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Truck, Plus, Search, MapPin, Navigation, 
  Calendar, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ShieldCheck, Loader2, Anchor
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LogistiqueTransportPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch active transfers
  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ['depot-transfers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('depot_transfers').select(`
        *,
        depot:logistique_depots(nom),
        cargaison:import_cargaisons(
          id, 
          quantite_reelle, 
          navire:import_navires(nom), 
          dossier:import_dossiers(numero_dossier, produit:import_produits(nom))
        )
      `).order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch compliant cargaisons ready for transfer
  const { data: readyCargaisons } = useQuery({
    queryKey: ['ready-for-transfer'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('import_cargaisons').select(`
        id, 
        quantite_reelle, 
        navire:import_navires(nom), 
        dossier:import_dossiers(numero_dossier, produit:import_produits(nom))
      `).eq('statut', 'conforme');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch depots for destination
  const { data: depots } = useQuery({
    queryKey: ['logistique-depots-list'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('logistique_depots').select('id, nom');
      return data || [];
    }
  });

  const createTransferMutation = useMutation({
    mutationFn: async (vars: any) => {
      // 1. Create transfer record
      const { error: transferError } = await (supabase as any).from('depot_transfers').insert({
        cargaison_id: vars.cargaison_id,
        depot_id: vars.depot_id,
        quantity: vars.quantity,
        status: 'en_transfert',
        validated_by: user?.id
      });
      if (transferError) throw transferError;

      // 2. Update cargaison status
      const { error: updateError } = await (supabase as any).from('import_cargaisons')
        .update({ statut: 'en_transfert' })
        .eq('id', vars.cargaison_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depot-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-transfer'] });
      setIsDialogOpen(false);
      toast.success("Transfert vers dépôt initié avec succès !");
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    }
  });

  const canManage = role === 'directeur_logistique' || role === 'agent_logistique' || role === 'super_admin';

  return (
    <DashboardLayout 
      title="Transport Interne & Dispatch Port-Dépôts" 
      subtitle="Planification des mouvements de produits du Port de Conakry vers les dépôts nationaux."
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Mouvements Actifs</p>
            <h3 className="text-4xl font-black mt-1">{transfers?.filter((t: any) => t.status === 'en_transfert').length || 0}</h3>
            <p className="text-xs mt-4 flex items-center gap-1.5 bg-white/10 w-fit px-3 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Transferts en cours
            </p>
          </Card>

          <Card className="border-none shadow-lg p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacité de Transfert</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              {transfers?.reduce((acc: number, t: any) => acc + Number(t.quantity), 0).toLocaleString()} T
            </h3>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600">Total volume cumulé</span>
            </div>
          </Card>

          <Card className="border-none shadow-lg p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prêt pour Transfert (Port)</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1 flex items-center gap-2">
              {readyCargaisons?.length || 0} <Anchor className="h-6 w-6" />
            </h3>
            <p className="text-xs mt-4 text-slate-500">Cargaisons certifiées conformes au port.</p>
          </Card>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border mt-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher par ID, Navire ou Dépôt..." 
              className="pl-10 h-11 border-none bg-slate-50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              {canManage && (
                <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> Initier un Transfert
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Transfert Port → Dépôt</DialogTitle>
                <DialogDescription>Démarrer un mouvement de produit certifié vers un centre de stockage.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4 pt-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const cargaisonId = fd.get('cargaison') as string;
                const cargaisonSelected = readyCargaisons?.find((c: any) => c.id === cargaisonId);
                
                createTransferMutation.mutate({
                  cargaison_id: cargaisonId,
                  depot_id: fd.get('depot'),
                  quantity: cargaisonSelected?.quantite_reelle || 0
                });
              }}>
                <div className="space-y-2">
                  <Label>Cargaison Conforme (Port)</Label>
                  <Select name="cargaison" required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Sélectionner cargaison..." />
                    </SelectTrigger>
                    <SelectContent>
                      {readyCargaisons?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.navire.nom} — {c.dossier.produit.nom} ({c.quantite_reelle} T)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dépôt de Destination</Label>
                  <Select name="depot" required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Sélectionner dépôt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {depots?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 mt-2">
                  <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Note Logistique</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Le volume total mesuré au quai sera transféré. Le statut de la cargaison passera à "EN TRANSFERT".
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={createTransferMutation.isPending}>
                    {createTransferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Valider l'Expédition"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {loadingTransfers ? (
            <div className="col-span-2 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" /></div>
          ) : transfers?.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-slate-400 italic font-medium">Aucun transfert en cours ou validé.</div>
          ) : transfers?.map((t: any) => (
            <TransportCard 
              key={t.id}
              id={`TR-${t.id.slice(0,8).toUpperCase()}`}
              from="Port Autonome (Conakry)"
              to={t.depot?.nom || "Dépôt inconnu"}
              product={t.cargaison?.dossier?.produit?.nom || "Produit"}
              quantity={`${Number(t.quantity).toLocaleString()} T`}
              trucks={Math.ceil(t.quantity / 30)} // Estimate trucks (30T per truck)
              status={t.status}
              date={new Date(t.created_at).toLocaleDateString()}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

interface TransportCardProps {
  id: string;
  from: string;
  to: string;
  product: string;
  quantity: string;
  trucks: number;
  status: string;
  date: string;
}

function TransportCard({ id, from, to, product, quantity, trucks, status, date }: TransportCardProps) {
  const statusConfig: Record<string, string> = {
    en_transfert: "bg-blue-50 text-blue-600 border-blue-100",
    complete: "bg-emerald-50 text-emerald-600 border-emerald-100",
    termine: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-indigo-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Transfert ID</p>
              <h4 className="font-bold text-slate-900">{id}</h4>
            </div>
          </div>
          <Badge className={cn("px-3 py-1 uppercase text-[10px] font-black border-none", statusConfig[status] || "bg-slate-100 text-slate-500")}>
            {status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-8 justify-between relative">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Origine</p>
              <p className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                <MapPin className="h-3.5 w-3.5 text-blue-500" /> {from}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Navigation className="h-4 w-4" />
              </div>
              <div className="h-px w-20 bg-slate-200 absolute top-1/2 -z-10" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Destination</p>
              <p className="font-bold text-slate-900 flex items-center gap-2 justify-end text-xs">
                {to} <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Produit</p>
              <p className="text-sm font-black text-slate-900 line-clamp-1">{product}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Volume</p>
              <p className="text-sm font-black text-slate-900">{quantity}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Initié le</p>
              <p className="text-sm font-black text-indigo-600 flex items-center justify-end gap-1">
                <Calendar className="h-3.5 w-3.5" /> {date}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-dashed">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[1,2,3].map(i => <div key={i} className="h-5 w-5 rounded-full border border-white bg-slate-200" />)}
              </div>
              <span className="text-[10px] font-bold text-slate-500">Estimation: ~{trucks} citernes</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary font-bold text-[10px] uppercase gap-2 hover:bg-primary/5">
              Suivi GPRS <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
