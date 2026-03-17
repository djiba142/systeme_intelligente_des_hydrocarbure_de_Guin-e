import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ship, Plus, Search, Info, MapPin, Anchor,
  Compass, Gauge, Radio
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ImportNavire {
  id: string;
  nom: string;
  imo_number: string;
  pavillon: string | null;
  capacite_mt: number;
  capitaine: string | null;
  statut: string;
}

interface NewNavire {
  nom: string;
  imo_number: string;
  pavillon: string | null;
  capacite_mt: number;
  capitaine: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export default function ImportNaviresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: ships, isLoading } = useQuery({
    queryKey: ['import-navires'],
    queryFn: async () => {
      const { data, error } = await db
        .from('import_navires')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return (data as ImportNavire[]) || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newShip: NewNavire) => {
      const { error } = await db
        .from('import_navires')
        .insert(newShip);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-navires'] });
      toast({ title: "Navire ajouté", description: "Le navire a été enregistré dans la flotte." });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: error.message || "Impossible d'enregistrer le navire." 
      });
    }
  });

  const filteredShips = ships?.filter((s: ImportNavire) => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.imo_number.includes(searchTerm)
  );

  return (
    <DashboardLayout 
      title="Flotte de Navires Pétroliers" 
      subtitle="Base de données des navires agréés pour le transport vers la République de Guinée."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher par nom ou numéro IMO..." 
              className="pl-10 h-11 border-none bg-slate-50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(role === 'super_admin' || role === 'directeur_importation' || role === 'agent_importation') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-primary/20 bg-primary">
                  <Plus className="h-4 w-4" /> Enregistrer un Navire
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Nouveau Navire Pétrolier</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 pt-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const capacityVal = Number(formData.get('capacite'));
                  if (isNaN(capacityVal) || capacityVal <= 0) {
                    toast({ variant: "destructive", title: "Erreur", description: "La capacité doit être un nombre positif." });
                    return;
                  }

                  createMutation.mutate({
                    nom: formData.get('nom') as string,
                    imo_number: formData.get('imo') as string,
                    pavillon: formData.get('pavillon') as string,
                    capacite_mt: capacityVal,
                    capitaine: formData.get('capitaine') as string,
                  });
                }}>
                  <div className="space-y-2">
                    <Label>Nom du Navire</Label>
                    <Input name="nom" placeholder="Ex: MT Sahara, Ocean Tanker..." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro IMO</Label>
                    <Input name="imo" placeholder="Ex: IMO 9451234" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pavillon (Pays)</Label>
                      <Input name="pavillon" placeholder="Ex: Liberia, Panama..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacité (MT)</Label>
                      <Input name="capacite" type="number" placeholder="Capacité en Tonnes" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nom du Capitaine</Label>
                    <Input name="capitaine" placeholder="Nom complet" />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl mt-4 font-bold" disabled={createMutation.isPending}>
                    Enregistrer dans la Flotte
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">Chargement des navires...</div>
          ) : filteredShips?.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 italic">Aucun navire répertorié.</div>
          ) : filteredShips?.map((ship: ImportNavire) => (
            <Card key={ship.id} className="border-none shadow-lg group hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Ship className="h-24 w-24 -rotate-12" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge className="bg-emerald-50 text-emerald-600 border-none uppercase text-[9px] font-black tracking-widest mb-2">
                    {ship.statut}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-400 text-[9px]">
                    {ship.imo_number}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">{ship.nom}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Anchor className="h-3 w-3" /> Pavillon : {ship.pavillon || 'Inconnu'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Capacité
                    </p>
                    <p className="text-sm font-black text-slate-900">{Number(ship.capacite_mt).toLocaleString()} T</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Radio className="h-3 w-3" /> Signal (AIS)
                    </p>
                    <p className="text-sm font-black text-emerald-600">Actif</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                      {ship.capitaine?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Capitaine</p>
                      <p className="text-xs font-bold text-slate-700">{ship.capitaine || 'N/A'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                    <Compass className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
