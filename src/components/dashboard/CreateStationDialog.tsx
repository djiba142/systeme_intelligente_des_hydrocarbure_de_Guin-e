import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fuel, MapPin } from 'lucide-react';
import { REGIONS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

interface CreateStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateStationDialog({ open, onOpenChange, onSuccess }: CreateStationDialogProps) {
  const { toast } = useToast();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    adresse: '',
    ville: '',
    region: '',
    type: 'urbaine' as 'urbaine' | 'routiere' | 'depot' | 'industrielle',
    entreprise_id: '',
    capacite_essence: 50000,
    capacite_gasoil: 50000,
    capacite_gpl: 0,
    capacite_lubrifiants: 0,
    nombre_cuves: 2,
    nombre_pompes: 4,
    latitude: 9.5092,
    longitude: -13.7122,
    gestionnaire_nom: '',
    gestionnaire_telephone: '',
    gestionnaire_email: '',
  });

  useEffect(() => {
    const fetchEntreprises = async () => {
      const { data, error } = await supabase
        .from('entreprises')
        .select('id, nom, sigle')
        .order('nom');
      if (!error && data) setEntreprises(data);
    };
    if (open) {
      fetchEntreprises();
      if (currentUserRole === 'admin_central' && currentUserProfile?.entreprise_id) {
          setFormData(prev => ({ ...prev, entreprise_id: currentUserProfile.entreprise_id || '' }));
      }
    }
  }, [open, currentUserRole, currentUserProfile]);

  const handleSave = async () => {
    const entrepriseId = formData.entreprise_id;

    if (!formData.nom.trim() || !formData.code.trim() || !formData.adresse.trim() || !formData.ville.trim() || !formData.region || !entrepriseId) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires manquants',
        description: 'Veuillez remplir tous les champs obligatoires (Nom, Code, Adresse, Ville, Région, Entreprise).',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nom: formData.nom.trim(),
        code: formData.code.trim().toUpperCase(),
        adresse: formData.adresse.trim(),
        ville: formData.ville.trim(),
        region: formData.region,
        type: formData.type,
        entreprise_id: entrepriseId,
        capacite_essence: Number(formData.capacite_essence) || 0,
        capacite_gasoil: Number(formData.capacite_gasoil) || 0,
        capacite_gpl: Number(formData.capacite_gpl) || 0,
        capacite_lubrifiants: Number(formData.capacite_lubrifiants) || 0,
        nombre_cuves: Number(formData.nombre_cuves) || 2,
        nombre_pompes: Number(formData.nombre_pompes) || 4,
        latitude: formData.latitude,
        longitude: formData.longitude,
        stock_essence: 0,
        stock_gasoil: 0,
        stock_gpl: 0,
        stock_lubrifiants: 0,
        statut: (['super_admin', 'admin_etat', 'secretariat_direction'].includes(currentUserRole || '')) ? 'ouverte' : 'attente_dsa',
        gestionnaire_nom: formData.gestionnaire_nom?.trim() || null,
        gestionnaire_telephone: formData.gestionnaire_telephone?.trim() || null,
        gestionnaire_email: formData.gestionnaire_email?.trim() || null,
      };

      const { error } = await supabase.from('stations').insert(payload);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `${formData.nom} (${formData.code}) a été créée avec succès.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Impossible d’enregistrer la station.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Fuel className="h-6 w-6 text-primary" />
            Nouvelle Station-Service
          </DialogTitle>
          <DialogDescription>
            Ajouter un nouveau point de distribution au réseau national.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          {/* Informations Générales */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-2">Identité & Localisation</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de la Station</Label>
                    <Input 
                        placeholder="Ex: SONAP Kaloum" 
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code Identifiant</Label>
                    <Input 
                        placeholder="Ex: STA-001" 
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</Label>
                    <Select value={formData.type} onValueChange={(val: any) => setFormData({ ...formData, type: val })}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="urbaine">Urbaine</SelectItem>
                            <SelectItem value="routiere">Routière</SelectItem>
                            <SelectItem value="industrielle">Industrielle</SelectItem>
                            <SelectItem value="depot">Dépôt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compagnie (OMAP)</Label>
              <Select 
                disabled={currentUserRole === 'admin_central'} 
                value={formData.entreprise_id}
                onValueChange={(val) => setFormData({ ...formData, entreprise_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {entreprises.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.sigle || e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Région</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, region: val })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ville / Préfecture</Label>
                    <Input 
                        placeholder="Ex: Conakry" 
                        value={formData.ville}
                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adresse Précise</Label>
              <Input 
                placeholder="Ex: Boulbinet, près de l'ambassade" 
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              />
            </div>
          </div>

          {/* Capacités Techniques */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-2">Capacités & Technique</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacité Essence (L)</Label>
                    <Input 
                        type="number"
                        value={formData.capacite_essence}
                        onChange={(e) => setFormData({ ...formData, capacite_essence: Number(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacité Gasoil (L)</Label>
                    <Input 
                        type="number"
                        value={formData.capacite_gasoil}
                        onChange={(e) => setFormData({ ...formData, capacite_gasoil: Number(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nb. de Cuves</Label>
                    <Input 
                        type="number"
                        value={formData.nombre_cuves}
                        onChange={(e) => setFormData({ ...formData, nombre_cuves: Number(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nb. de Pompes</Label>
                    <Input 
                        type="number"
                        value={formData.nombre_pompes}
                        onChange={(e) => setFormData({ ...formData, nombre_pompes: Number(e.target.value) })}
                    />
                </div>
            </div>

            <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-2 mt-6">Gestionnaire</h3>
            <div className="space-y-3">
                <Input 
                    placeholder="Nom du gérant" 
                    value={formData.gestionnaire_nom}
                    onChange={(e) => setFormData({ ...formData, gestionnaire_nom: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                    <Input 
                        placeholder="Téléphone" 
                        value={formData.gestionnaire_telephone}
                        onChange={(e) => setFormData({ ...formData, gestionnaire_telephone: e.target.value })}
                    />
                    <Input 
                        placeholder="Email" 
                        type="email"
                        value={formData.gestionnaire_email}
                        onChange={(e) => setFormData({ ...formData, gestionnaire_email: e.target.value })}
                    />
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Annuler</Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest px-8 shadow-xl"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Créer la Station-Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
