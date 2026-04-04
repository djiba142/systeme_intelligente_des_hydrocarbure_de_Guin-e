import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderResponseDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OrderResponseDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: OrderResponseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>(order?.statut || 'en_cours');
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      const newNotes = order.notes 
        ? `${order.notes}\n\n[Réponse Entreprise ${new Date().toLocaleDateString()}]: ${comment}`
        : `[Réponse Entreprise ${new Date().toLocaleDateString()}]: ${comment}`;

      const { error } = await supabase
        .from('ordres_livraison')
        .update({
          statut: status,
          notes: newNotes,
          date_expedition: status === 'en_cours' ? new Date().toISOString() : order.date_expedition,
          date_livraison: status === 'livre' ? new Date().toISOString() : order.date_livraison,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success("Mise à jour enregistrée avec succès");
      onSuccess();
      onOpenChange(false);
      setComment('');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 border-none overflow-hidden shadow-2xl">
        <div className="bg-slate-900 px-6 py-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Truck className="h-24 w-24" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
               <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Truck className="h-6 w-6" />
               </div>
               Répondre à l'Ordre
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Mettez à jour le statut du ravitaillement pour la station {order?.station?.nom}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-white">
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Statut de l'opération</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold focus:ring-slate-900">
                <SelectValue placeholder="Changer le statut" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="en_cours" className="font-bold py-3 focus:bg-blue-50 focus:text-blue-700">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    En cours de préparation / expédition
                  </div>
                </SelectItem>
                <SelectItem value="livre" className="font-bold py-3 focus:bg-emerald-50 focus:text-emerald-700">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Livraison effectuée à la station
                  </div>
                </SelectItem>
                <SelectItem value="annule" className="font-bold py-3 focus:bg-red-50 focus:text-red-700">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Impossible de satisfaire l'ordre (Annuler)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Justification / Commentaire</Label>
                <span className="text-[10px] text-slate-400 font-bold italic">Visible par la SONAP</span>
             </div>
             <Textarea 
               placeholder="Détails sur l'envoi, heure de livraison prévue, ou raison d'annulation..."
               className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-slate-900 p-4 resize-none"
               value={comment}
               onChange={(e) => setComment(e.target.value)}
             />
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
             <AlertCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
             <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Cette mise à jour sera notifiée instantanément aux services de la SONAP pour le suivi des flux nationaux.
             </p>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl font-bold text-slate-500 hover:bg-white"
          >
            Fermer
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !comment.trim()} 
            className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest h-12 shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Traitement...</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" /> Valider la mise à jour</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
