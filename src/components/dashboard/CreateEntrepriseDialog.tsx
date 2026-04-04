import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Building2 } from 'lucide-react';

interface CreateEntrepriseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEntrepriseDialog({ open, onOpenChange, onSuccess }: CreateEntrepriseDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    sigle: '',
    type: '',
    numeroAgrement: '',
    region: '',
    contactNom: '',
    contactTelephone: '',
    contactEmail: '',
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Fichier trop volumineux',
          description: 'La taille maximale est de 2 Mo.',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Erreur upload logo:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.nom.trim() || !formData.sigle.trim() || !formData.type || !formData.region) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires manquants',
        description: 'Nom, sigle, type et région sont requis.',
      });
      return;
    }

    setLoading(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const numeroAgrement = formData.numeroAgrement.trim() || `AGR-${Date.now()}`;

      const { error } = await supabase.from('entreprises').insert({
        nom: formData.nom.trim(),
        sigle: formData.sigle.trim(),
        type: formData.type,
        numero_agrement: numeroAgrement,
        region: formData.region,
        statut: 'actif',
        logo_url: logoUrl,
        contact_nom: formData.contactNom.trim() || null,
        contact_telephone: formData.contactTelephone.trim() || null,
        contact_email: formData.contactEmail.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `${formData.nom} a été créée avec succès.`,
      });

      setFormData({
        nom: '',
        sigle: '',
        type: '',
        numeroAgrement: '',
        region: '',
        contactNom: '',
        contactTelephone: '',
        contactEmail: '',
      });
      setLogoFile(null);
      setLogoPreview(null);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Impossible d’enregistrer l’entreprise.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Nouvelle Entreprise
          </DialogTitle>
          <DialogDescription>
            Enregistrer une nouvelle compagnie pétrolière dans le système.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom Complet</Label>
              <Input 
                placeholder="Ex: TotalEnergies Guinée" 
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sigle / Code</Label>
              <Input 
                placeholder="Ex: TOTAL" 
                value={formData.sigle}
                onChange={(e) => setFormData({ ...formData, sigle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type d'activité</Label>
              <Select onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OMAP">OMAP (Marketter)</SelectItem>
                  <SelectItem value="DISTRIBUTEUR">Distributeur</SelectItem>
                  <SelectItem value="TRANSPORTATEUR">Transporteur</SelectItem>
                  <SelectItem value="STOCKAGE">Stockage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Numéro Agrément</Label>
              <Input 
                placeholder="Laissez vide pour auto-générer" 
                value={formData.numeroAgrement}
                onChange={(e) => setFormData({ ...formData, numeroAgrement: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Région Siège</Label>
              <Select onValueChange={(val) => setFormData({ ...formData, region: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conakry">Conakry</SelectItem>
                  <SelectItem value="Kindia">Kindia</SelectItem>
                  <SelectItem value="Boké">Boké</SelectItem>
                  <SelectItem value="Mamou">Mamou</SelectItem>
                  <SelectItem value="Faranah">Faranah</SelectItem>
                  <SelectItem value="Kankan">Kankan</SelectItem>
                  <SelectItem value="Labé">Labé</SelectItem>
                  <SelectItem value="Nzérékoré">Nzérékoré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo de l'entreprise</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="h-full w-full object-contain" />
                  ) : (
                    <Upload className="h-6 w-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleLogoChange} className="text-xs h-9 cursor-pointer" />
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PNG, JPG max 2Mo</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Référent</Label>
                <Input 
                    placeholder="Nom du responsable" 
                    value={formData.contactNom}
                    onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                    className="mb-2"
                />
                <Input 
                    placeholder="Téléphone" 
                    value={formData.contactTelephone}
                    onChange={(e) => setFormData({ ...formData, contactTelephone: e.target.value })}
                />
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
            Enregistrer l'Entreprise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
