import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse, Plus, Search, MapPin, Settings2, BarChart3 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DepotStock { quantite_disponible: number; produit: { nom: string }; }
interface Depot { id: string; nom: string; localisation: string; capacite_max: number; stocks: DepotStock[]; }
interface NewDepot { nom: FormDataEntryValue | null; localisation: FormDataEntryValue | null; capacite_max: number; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export default function LogistiqueDepotsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: depots, isLoading } = useQuery({
    queryKey: ['logistique-depots'],
    queryFn: async () => {
      const { data, error } = await db.from('logistique_depots').select(`*, stocks:logistique_stocks(quantite_disponible, produit:import_produits(nom))`).order('nom', { ascending: true });
      if (error) throw error;
      return (data as Depot[]) || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newDepot: NewDepot) => {
      const { error } = await db.from('logistique_depots').insert(newDepot);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistique-depots'] });
      toast({ title: "Dépôt créé", description: "Le nouveau centre de stockage a été répertorié." });
    }
  });

  return (
    <DashboardLayout title="Gestion des Dépôts Pétroliers" subtitle="Supervision de la capacité de stockage nationale et suivi des unités de stockage.">
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Rechercher un dépôt ou une ville..." className="pl-10 h-11 border-none bg-slate-50 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /> Ajouter un Dépôt</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader><DialogTitle className="text-xl font-black">Nouveau Dépôt Pétrolier</DialogTitle></DialogHeader>
              <form className="space-y-4 pt-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createMutation.mutate({ nom: fd.get('nom'), localisation: fd.get('ville'), capacite_max: Number(fd.get('capacite')) }); }}>
                <div className="space-y-2"><Label>Nom du Dépôt</Label><Input name="nom" placeholder="Ex: SGP Kaloum, Dépôt Kamsar..." required /></div>
                <div className="space-y-2"><Label>Localisation (Ville)</Label><Input name="ville" placeholder="Ex: Conakry, Kankan..." required /></div>
                <div className="space-y-2"><Label>Capacité de Stockage Totale (MT)</Label><Input name="capacite" type="number" placeholder="Ex: 500000" /></div>
                <Button type="submit" className="w-full h-12 rounded-xl mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={createMutation.isPending}>Enregistrer le Dépôt</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">Chargement des dépôts...</div>
          ) : depots?.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 italic">Aucun dépôt enregistré.</div>
          ) : depots?.map((depot: Depot) => {
            const totalStored = depot.stocks?.reduce((acc: number, s: DepotStock) => acc + Number(s.quantite_disponible), 0) || 0;
            const occupancy = depot.capacite_max > 0 ? (totalStored / depot.capacite_max) * 100 : 0;
            return (
              <Card key={depot.id} className="border-none shadow-lg hover:shadow-2xl transition-all duration-500 group overflow-hidden">
                <CardHeader className="pb-4 relative bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><Warehouse className="h-5 w-5" /></div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase tracking-tighter">Opérationnel</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">{depot.nom}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> {depot.localisation}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    {depot.stocks?.length > 0 ? depot.stocks.map((s: DepotStock) => (
                      <div key={s.produit.nom} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <span>{s.produit.nom}</span>
                          <span className="text-slate-900">{Number(s.quantite_disponible).toLocaleString()} T</span>
                        </div>
                        <Progress value={30} className="h-1.5 bg-slate-100" />
                      </div>
                    )) : (<p className="text-xs text-slate-400 italic">Aucun produit en stock.</p>)}
                  </div>
                  <div className="pt-2 border-t mt-4">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Occupation Totale</p>
                        <p className="text-sm font-black text-slate-900">{Number(totalStored).toLocaleString()} / {Number(depot.capacite_max).toLocaleString()} T</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] h-6 px-2 font-black border-none", occupancy > 80 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>{occupancy.toFixed(0)}%</Badge>
                    </div>
                    <Progress value={occupancy} className={cn("h-2 rounded-full", occupancy > 80 ? "bg-red-100" : "bg-blue-100")} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg gap-1.5 font-bold text-[10px] uppercase"><BarChart3 className="h-3.5 w-3.5" /> Stats</Button>
                    <Button variant="outline" size="sm" className="h-9 w-9 rounded-lg p-0"><Settings2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
