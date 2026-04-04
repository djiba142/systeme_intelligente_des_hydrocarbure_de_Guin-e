import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, Truck, Droplets, Calendar, 
  MapPin, Clock, Search, Loader2, AlertTriangle,
  ClipboardCheck, Navigation, ArrowDownCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function StationReceptionPage() {
  const { user, profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch deliveries 'en_cours' for this station (or all if super_admin)
  const { data: activeDeliveries, isLoading } = useQuery({
    queryKey: ['station-deliveries-active', profile?.station_id],
    queryFn: async () => {
      let query = (supabase as any).from('livraisons').select(`
        *,
        station:stations(id, nom, adresse, ville)
      `).eq('statut', 'en_cours');

      // If station manager, filter by their station
      if (role === 'gestionnaire_station' && profile?.station_id) {
        query = query.eq('station_id', profile.station_id);
      }

      const { data, error } = await query.order('date_depart', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const confirmReceptionMutation = useMutation({
    mutationFn: async (vars: { id: string, quantite_recue: number, notes?: string }) => {
      const { error } = await (supabase as any).from('livraisons')
        .update({ 
          statut: 'validee', 
          quantite_recue: vars.quantite_recue,
          date_reception: new Date().toISOString(),
          notes: vars.notes,
          valide_par: user?.id
        })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-deliveries-active'] });
      setIsDialogOpen(false);
      toast.success("Réception confirmée ! Le stock de la station a été mis à jour via automate.");
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    }
  });

  const handleConfirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    confirmReceptionMutation.mutate({
      id: selectedDelivery.id,
      quantite_recue: Number(fd.get('quantite_recue')),
      notes: fd.get('notes') as string
    });
  };

  return (
    <DashboardLayout 
      title="Réception Station" 
      subtitle="Confirmation des arrivées de camions-citernes et mise en stock."
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Livraisons Attendues</p>
            <h3 className="text-4xl font-black mt-1">{activeDeliveries?.length || 0}</h3>
            <p className="text-xs mt-4 flex items-center gap-1.5 bg-white/10 w-fit px-3 py-1 rounded-full">
              <Clock className="h-3 w-3" /> Camions en route
            </p>
          </Card>

          <Card className="border-none shadow-lg p-6 flex flex-col justify-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Total Réceptionné (Mois)</p>
                <h3 className="text-2xl font-black text-slate-900">128,450 L</h3>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-lg p-6 flex flex-col justify-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Écarts de Volume</p>
                <h3 className="text-2xl font-black text-slate-900">0.4 %</h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Rechercher par plaque, chauffeur ou produit..." 
            className="h-14 pl-12 rounded-2xl border-none shadow-sm bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Deliveries List */}
        <div className="grid gap-6">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" /></div>
          ) : activeDeliveries?.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Navigation className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium italic">Aucun camion n'est actuellement en route vers votre station.</p>
            </div>
          ) : (
            activeDeliveries.map((delivery: any) => (
              <DeliveryCard 
                key={delivery.id} 
                delivery={delivery} 
                onConfirm={() => {
                  setSelectedDelivery(delivery);
                  setIsDialogOpen(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Confirmer Réception</DialogTitle>
            <DialogDescription>Validez la quantité réelle livrée à la station.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirm} className="space-y-4 pt-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Volume Prévu</p>
                <p className="text-lg font-black text-slate-900 uppercase">{selectedDelivery?.quantite_prevue} L</p>
              </div>
              <ArrowDownCircle className="h-6 w-6 text-indigo-500" />
            </div>

            <div className="space-y-2">
              <Label>Quantité Réellement Recue (L)</Label>
              <Input 
                name="quantite_recue" 
                type="number" 
                required 
                defaultValue={selectedDelivery?.quantite_prevue}
                className="h-12 rounded-xl bg-slate-50 border-none font-bold text-lg" 
              />
            </div>

            <div className="space-y-2">
              <Label>Observations / Notes</Label>
              <Input name="notes" className="h-12 rounded-xl bg-slate-50 border-none" placeholder="RAS, écart minime, etc." />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={confirmReceptionMutation.isPending}>
                {confirmReceptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Vérifier & Mettre en Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function DeliveryCard({ delivery, onConfirm }: { delivery: any, onConfirm: () => void }) {
  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0 flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 bg-slate-50 p-6 flex flex-col justify-between border-r">
          <div>
            <Badge className="bg-blue-100 text-blue-700 border-none px-3 py-1 uppercase text-[10px] font-black mb-4">
              En Route
            </Badge>
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-4">
              <Truck className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-black text-slate-900 uppercase">{delivery.camion_plaque}</h4>
            <p className="text-xs text-slate-500 font-medium">Chauffeur: {delivery.chauffeur_nom}</p>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Depuis le dépôt</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" /> {new Date(delivery.date_depart).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Station Destination</p>
              <h4 className="font-black text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" /> {delivery.station?.nom}
              </h4>
              <p className="text-[11px] text-slate-500 ml-6">{delivery.station?.adresse}, {delivery.station?.ville}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Produit & Volume Prévu</p>
              <h4 className="font-black text-slate-900 uppercase flex items-center justify-end gap-2">
                <Droplets className="h-4 w-4 text-blue-500" /> {delivery.produit} — {delivery.quantite_prevue.toLocaleString()} L
              </h4>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase">Camion géolocalisé - Proche station</span>
            </div>
            <Button 
              onClick={onConfirm}
              className="px-6 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-lg shadow-indigo-500/20"
            >
              <ClipboardCheck className="h-4 w-4" /> Confirmer Réception
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
