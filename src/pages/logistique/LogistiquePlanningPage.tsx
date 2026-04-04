import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ClipboardList, Search, Plus, Truck, Warehouse, 
  Fuel, MapPin, Calendar, Clock, AlertCircle, 
  CheckCircle2, Loader2, ArrowRightCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LogistiquePlanningPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Stocks available in Depots
  const { data: stocks, isLoading: loadingStocks } = useQuery({
    queryKey: ['logistique-stocks-planning'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('logistique_stocks').select(`
        *,
        depot:logistique_depots(id, nom),
        produit:import_produits(id, nom)
      `).gt('quantite_disponible', 0);
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Stations for destination
  const { data: stations } = useQuery({
    queryKey: ['stations-list-planning'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('stations').select('id, nom, localisation');
      if (error) throw error;
      return data || [];
    }
  });

  // 3. Fetch current Deliveries (Planning)
  const { data: deliveries, isLoading: loadingDeliveries } = useQuery({
    queryKey: ['logistique-livraisons-planning'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('livraisons').select(`
        *,
        station:stations(nom),
        entreprise:entreprises(nom)
      `).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createPlanningMutation = useMutation({
    mutationFn: async (vars: any) => {
      // Create a new delivery record in 'en_attente' status (Planified)
      const { error } = await (supabase as any).from('livraisons').insert({
        station_id: vars.station_id,
        produit: vars.produit,
        quantite_prevue: vars.quantite,
        statut: 'en_attente',
        notes: vars.notes,
        camion_plaque: vars.camion_plaque,
        chauffeur_nom: vars.chauffeur_nom
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistique-livraisons-planning'] });
      setIsDialogOpen(false);
      toast.success("Planning de distribution enregistré !");
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    }
  });

  const startDeliveryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await (supabase as any).from('livraisons')
        .update({ statut: 'en_cours', date_depart: new Date().toISOString() })
        .eq('id', deliveryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistique-livraisons-planning'] });
      toast.success("Livraison en route ! Le statut est passé à 'EN ROUTE'.");
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    }
  });

  const canManage = role === 'directeur_logistique' || role === 'agent_logistique' || role === 'super_admin';

  return (
    <DashboardLayout 
      title="Planning de Distribution" 
      subtitle="Allocation des produits pétroliers des dépôts nationaux vers le réseau de stations-service."
    >
      <div className="space-y-6">
        {/* Stats Section */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-none shadow-lg bg-indigo-600 text-white p-5">
            <p className="text-[10px] font-bold uppercase opacity-70">Stocks Total Dépôts</p>
            <h3 className="text-2xl font-black mt-1">
              {stocks?.reduce((acc: number, s: any) => acc + Number(s.quantite_disponible), 0).toLocaleString()} MT
            </h3>
          </Card>
          <Card className="border-none shadow-lg bg-emerald-600 text-white p-5">
            <p className="text-[10px] font-bold uppercase opacity-70">Livraisons Planifiées</p>
            <h3 className="text-2xl font-black mt-1">
              {deliveries?.filter((d: any) => d.statut === 'en_attente').length || 0}
            </h3>
          </Card>
          <Card className="border-none shadow-lg bg-blue-600 text-white p-5">
            <p className="text-[10px] font-bold uppercase opacity-70">En Route</p>
            <h3 className="text-2xl font-black mt-1">
              {deliveries?.filter((d: any) => d.statut === 'en_cours').length || 0}
            </h3>
          </Card>
          <Card className="border-none shadow-lg bg-amber-600 text-white p-5">
            <p className="text-[10px] font-bold uppercase opacity-70">Volume en Transit</p>
            <h3 className="text-2xl font-black mt-1">
              {deliveries?.filter((d: any) => d.statut === 'en_cours').reduce((acc: number, d: any) => acc + Number(d.quantite_prevue), 0).toLocaleString()} MT
            </h3>
          </Card>
        </div>

        {/* Actions & Search */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border mt-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher une planification, station ou chauffeur..." 
              className="pl-10 h-11 border-none bg-slate-50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              {canManage && (
                <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> Programmer une Livraison
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Planning Dépôt → Station</DialogTitle>
                <DialogDescription>Assigner un volume disponible en dépôt à une station-service spécifique.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4 pt-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const stockId = fd.get('stock') as string;
                const stockSelected = stocks?.find((s: any) => s.id === stockId);
                
                createPlanningMutation.mutate({
                  station_id: fd.get('station'),
                  produit: stockSelected?.produit?.nom.toLowerCase(),
                  quantite: Number(fd.get('quantite')),
                  camion_plaque: fd.get('plaque'),
                  chauffeur_nom: fd.get('chauffeur'),
                  notes: fd.get('notes')
                });
              }}>
                <div className="space-y-2">
                  <Label>Produit Disponible (Dépôt)</Label>
                  <Select name="stock" required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Sélectionner stock..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.depot.nom} — {s.produit.nom} ({s.quantite_disponible} MT)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Station de Destination</Label>
                  <Select name="station" required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Sélectionner station..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stations?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.nom} ({s.localisation})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantité (L/MT)</Label>
                    <Input name="quantite" type="number" required className="h-12 rounded-xl bg-slate-50" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Plaque Camion</Label>
                    <Input name="plaque" required className="h-12 rounded-xl bg-slate-50" placeholder="RC-..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nom du Chauffeur</Label>
                  <Input name="chauffeur" required className="h-12 rounded-xl bg-slate-50" placeholder="Nom complet" />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={createPlanningMutation.isPending}>
                    {createPlanningMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Enregistrer le Planning"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Deliveries Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {loadingDeliveries ? (
            <div className="col-span-2 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" /></div>
          ) : deliveries?.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-slate-400 italic">Aucune livraison en cours de planification.</div>
          ) : deliveries?.map((d: any) => (
            <DeliveryPlanningCard 
              key={d.id} 
              delivery={d} 
              onStart={() => startDeliveryMutation.mutate(d.id)}
              isStarting={startDeliveryMutation.isPending}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DeliveryPlanningCard({ delivery, onStart, isStarting }: { delivery: any; onStart: () => void; isStarting: boolean }) {
  const statusConfig: Record<string, { label: string; class: string }> = {
    en_attente: { label: 'PLANIFIÉ', class: 'bg-amber-50 text-amber-600' },
    en_cours: { label: 'EN ROUTE', class: 'bg-blue-50 text-blue-600' },
    validee: { label: 'LIVRÉ', class: 'bg-emerald-50 text-emerald-600' },
    rejetee: { label: 'REJETÉ', class: 'bg-red-50 text-red-600' }
  };

  const config = statusConfig[delivery.statut] || { label: delivery.statut, class: 'bg-slate-100 text-slate-600' };

  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Planning ID</p>
              <h4 className="font-bold text-slate-900 line-clamp-1">{delivery.id.split('-')[0].toUpperCase()}</h4>
            </div>
          </div>
          <Badge className={cn("px-3 py-1 uppercase text-[10px] font-black border-none", config.class)}>
            {config.label}
          </Badge>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Station Destination</p>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Fuel className="h-4 w-4 text-emerald-500" /> {delivery.station?.nom}
              </h4>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Produit & Volume</p>
              <h4 className="text-sm font-black text-slate-900 uppercase">
                {delivery.produit} — {Number(delivery.quantite_prevue).toLocaleString()} MT
              </h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Camion:</span>
              <span className="font-bold text-slate-900 uppercase">{delivery.camion_plaque}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-2 font-black tracking-tight underline">Chauffeur:</span>
              <span className="font-bold text-slate-900">{delivery.chauffeur_nom}</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-dashed">
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Créé le {new Date(delivery.created_at).toLocaleDateString()}</p>
            {delivery.statut === 'en_attente' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 rounded-lg text-[10px] font-black uppercase gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={onStart}
                disabled={isStarting}
              >
                {isStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightCircle className="h-3.5 w-3.5" />}
                Autoriser Départ
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
