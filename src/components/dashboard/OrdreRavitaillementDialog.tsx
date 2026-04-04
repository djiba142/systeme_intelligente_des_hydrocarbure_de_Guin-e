import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ordreSchema = z.object({
  entrepriseId: z.string().min(1, 'Veuillez sélectionner une entreprise'),
  stationId: z.string().min(1, 'Veuillez sélectionner une station'),
  carburant: z.enum(['essence', 'gasoil', 'gpl', 'lubrifiants']),
  volume: z.number().min(100, 'Volume minimum de 100 L'),
  urgence: z.enum(['urgente', 'haute', 'normale', 'basse']),
  commentaire: z.string().min(5, 'Veuillez justifier cet ordre officiel'),
});

type OrdreFormValues = z.infer<typeof ordreSchema>;

interface Entreprise {
  id: string;
  nom: string;
}

interface Station {
  id: string;
  nom: string;
  ville: string;
}

interface OrdreRavitaillementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OrdreRavitaillementDialog({ open, onOpenChange, onSuccess }: OrdreRavitaillementDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const form = useForm<OrdreFormValues>({
    resolver: zodResolver(ordreSchema),
    defaultValues: {
      entrepriseId: '',
      stationId: '',
      carburant: 'essence',
      volume: 10000,
      urgence: 'urgente',
      commentaire: 'Ordre officiel de ravitaillement suite à une détection de rupture ou risque de pénurie.',
    },
  });

  const selectedEntreprise = form.watch('entrepriseId');

  useEffect(() => {
    if (open) {
      const fetchEntreprises = async () => {
        const { data } = await supabase.from('entreprises').select('id, nom').eq('statut', 'actif');
        if (data) setEntreprises(data);
      };
      fetchEntreprises();
    }
  }, [open]);

  useEffect(() => {
    if (selectedEntreprise) {
      const fetchStations = async () => {
        const { data } = await supabase.from('stations').select('id, nom, ville').eq('entreprise_id', selectedEntreprise);
        if (data) setStations(data);
      };
      fetchStations();
    } else {
      setStations([]);
    }
  }, [selectedEntreprise]);

  const onSubmit = async (values: OrdreFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('ordres_livraison').insert({
        station_id: values.stationId,
        carburant: values.carburant,
        quantite_demandee: values.volume,
        priorite: values.urgence,
        statut: 'approuve', // Décision de l'Etat = approuvé d'office pour exécution
        notes: `Instruction Officielle État : ${values.commentaire}`,
        created_by: user.id,
        approuve_par: user.id,
      });

      if (error) throw error;

      toast({
        title: "Ordre officiel transmis",
        description: "L'entreprise pétrolière a été notifiée de cet ordre de ravitaillement d'urgence.",
      });
      
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'émettre l'ordre de ravitaillement.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-600 font-bold uppercase">
            <ShieldAlert className="h-6 w-6" />
            Ordre Officiel de Ravitaillement
          </DialogTitle>
          <DialogDescription>
            Émission d'une instruction administrative d'urgence pour le ravitaillement d'une zone en risque de rupture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Entreprise Pétrolière Assignée</label>
            <Select onValueChange={(v) => form.setValue('entrepriseId', v, { shouldValidate: true })} value={form.watch('entrepriseId')}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'entreprise" />
              </SelectTrigger>
              <SelectContent>
                {entreprises.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.formState.errors.entrepriseId && <p className="text-xs text-red-500">{form.formState.errors.entrepriseId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Station ou Zone Cible</label>
            <Select disabled={!selectedEntreprise || stations.length === 0} onValueChange={(v) => form.setValue('stationId', v, { shouldValidate: true })} value={form.watch('stationId')}>
              <SelectTrigger>
                <SelectValue placeholder={!selectedEntreprise ? "Sélectionnez d'abord l'entreprise" : "Sélectionner la station"} />
              </SelectTrigger>
              <SelectContent>
                {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.nom} ({s.ville})</SelectItem>)}
              </SelectContent>
            </Select>
            {form.formState.errors.stationId && <p className="text-xs text-red-500">{form.formState.errors.stationId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produit</label>
              <Select onValueChange={(v: any) => form.setValue('carburant', v)} value={form.watch('carburant')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="essence">Essence</SelectItem>
                  <SelectItem value="gasoil">Gasoil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Volume (Litres)</label>
              <Input 
                type="number" 
                {...form.register('volume', { valueAsNumber: true })} 
              />
              {form.formState.errors.volume && <p className="text-xs text-red-500">{form.formState.errors.volume.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Niveau d'Urgence</label>
            <Select onValueChange={(v: any) => form.setValue('urgence', v)} value={form.watch('urgence')}>
              <SelectTrigger className="border-red-200 bg-red-50 text-red-700 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgente" className="text-red-600 font-bold">URGENCE CRITIQUE</SelectItem>
                <SelectItem value="haute" className="text-orange-600 font-bold">HAUTE PRIORITÉ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Instruction Administrative</label>
            <Textarea 
              {...form.register('commentaire')} 
              rows={3}
              placeholder="Justification officielle de cet ordre pour traçabilité..."
            />
            {form.formState.errors.commentaire && <p className="text-xs text-red-500">{form.formState.errors.commentaire.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              Émettre l'Ordre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
