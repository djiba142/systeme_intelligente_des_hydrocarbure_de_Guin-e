import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Upload, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EntrepriseCard } from '@/components/entreprises/EntrepriseCard';
import { REGIONS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
// Import logos
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Entreprise } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function EntreprisesPage() {
  const { role: currentUserRole, canManageEntreprises } = useAuth();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  // Rôles Admin Central qui peuvent valider
  const isAdminCentral = ['super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint'].includes(currentUserRole || '');
  // Rôles DSA qui créent (avec validation requise)
  const isDSA = ['directeur_aval', 'directeur_adjoint_aval'].includes(currentUserRole || '');

  const [formData, setFormData] = useState<{
    nom: string;
    sigle: string;
    type: 'compagnie' | 'distributeur' | '';
    numeroAgrement: string;
    region: string;
    contactNom: string;
    contactTelephone: string;
    contactEmail: string;
    quota_essence: number;
    quota_gasoil: number;
  }>({
    nom: '',
    sigle: '',
    type: '',
    numeroAgrement: '',
    region: '',
    contactNom: '',
    contactTelephone: '',
    contactEmail: '',
    quota_essence: 0,
    quota_gasoil: 0,
  });

  const localLogoMapping: Record<string, string> = {
    'TOTAL': logoTotal,
    'TotalEnergies': logoTotal,
    'TO': logoTotal,
    'SHELL': logoShell,
    'VIVO': logoShell,
    'SH': logoShell,
    'TMI': logoTMI,
    'TM': logoTMI,
    'KP': logoKP,
    'Kamsar Petroleum': logoKP,
    'kamsar petroleum': logoKP,
  };

  const getLogoForEntreprise = (sigle: string, nom: string): string | undefined => {
    // Essayer d'abord avec le sigle
    if (localLogoMapping[sigle]) {
      return localLogoMapping[sigle];
    }
    // Essayer avec le nom
    if (localLogoMapping[nom]) {
      return localLogoMapping[nom];
    }
    // Essayer les variations du nom
    const nomVariations = [
      nom.split('(')[0].trim(), // "Vivo Energy Guinée"
      nom.split('-')[0].trim(), // Pour les noms avec tiret
    ];
    for (const variation of nomVariations) {
      if (localLogoMapping[variation]) {
        return localLogoMapping[variation];
      }
    }
    return undefined;
  };

  const { toast } = useToast();

  const fetchEntreprises = async () => {
    setLoading(true);
    try {
      const { data: entData, error } = await supabase
        .from('entreprises')
        .select('*')
        .order('nom');

      if (error) throw error;

      const { data: stationCounts } = await supabase
        .from('stations')
        .select('entreprise_id');

      const counts = (stationCounts || []).reduce<Record<string, number>>((acc, s) => {
        const id = s.entreprise_id;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

      const mapped: Entreprise[] = (entData || []).map(e => ({
        id: e.id,
        nom: e.nom,
        sigle: e.sigle,
        type: e.type as 'compagnie' | 'distributeur',
        numeroAgrement: e.numero_agrement,
        region: e.region,
        statut: e.statut as 'actif' | 'suspendu' | 'ferme',
        nombreStations: counts[e.id] ?? 0,
        logo: e.logo_url ?? getLogoForEntreprise(e.sigle, e.nom),
        contact: {
          nom: e.contact_nom || 'N/A',
          telephone: e.contact_telephone || '',
          email: e.contact_email || '',
        },
      }));

      setEntreprises(mapped);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: err instanceof Error ? err.message : 'Impossible de charger les entreprises.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntreprises();
  }, []);

  const filteredEntreprises = entreprises.filter(e => {
    const matchesSearch = e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.sigle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || e.region === selectedRegion;
    const matchesType = selectedType === 'all' || e.type === selectedType;
    const matchesStatut = selectedStatut === 'all' || e.statut === selectedStatut;
    return matchesSearch && matchesRegion && matchesType && matchesStatut;
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
      toast({
        variant: 'destructive',
        title: 'Erreur upload',
        description: err instanceof Error ? err.message : 'Impossible de télécharger le logo.',
      });
      return null;
    }
  };

  const handleSaveEntreprise = async () => {
    if (!formData.nom.trim() || !formData.sigle.trim() || !formData.type || !formData.region) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires manquants',
        description: 'Nom, sigle, type et région sont requis.',
      });
      return;
    }

    setSaving(true);

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
        statut: isDSA ? 'attente_validation' : 'actif',
        logo_url: logoUrl,
        contact_nom: formData.contactNom.trim() || null,
        contact_telephone: formData.contactTelephone.trim() || null,
        contact_email: formData.contactEmail.trim() || null,
        quota_essence: formData.quota_essence || 0,
        quota_gasoil: formData.quota_gasoil || 0,
      });

      if (error) throw error;

      toast({
        title: isDSA ? 'Demande envoyée' : 'Succès',
        description: isDSA ? `${formData.nom} a été créée et est en attente de validation par l'Administration Centrale.` : `${formData.nom} a été créée avec succès.`,
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
        quota_essence: 0,
        quota_gasoil: 0,
      });
      setLogoFile(null);
      setLogoPreview(null);
      setIsDialogOpen(false);
      await fetchEntreprises();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Impossible d’enregistrer l’entreprise.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValidateEntreprise = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({ statut: 'actif' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Entreprise validée', description: 'L\'entreprise est maintenant active.' });
      await fetchEntreprises();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const handleRejectEntreprise = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({ statut: 'ferme' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Demande rejetée', description: 'L\'entreprise a été rejetée.' });
      await fetchEntreprises();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  return (
    <DashboardLayout
      title="Entreprises"
      subtitle="Gestion des distributeurs d'hydrocarbures"
    >
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les régions</SelectItem>
            {REGIONS.map(region => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="compagnie">Compagnie</SelectItem>
            <SelectItem value="distributeur">Distributeur</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatut} onValueChange={setSelectedStatut}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="attente_validation">En attente de validation</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
            <SelectItem value="ferme">Fermé / Rejeté</SelectItem>
          </SelectContent>
        </Select>

        {canManageEntreprises && (
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle entreprise
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/50 rounded-xl">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{filteredEntreprises.length}</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Actives</p>
          <p className="text-2xl font-bold text-stock-healthy">
            {filteredEntreprises.filter(e => e.statut === 'actif').length}
          </p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="text-2xl font-bold text-amber-500">
            {entreprises.filter(e => e.statut === 'attente_validation').length}
          </p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Stations totales</p>
          <p className="text-2xl font-bold">
            {filteredEntreprises.reduce((sum, e) => sum + e.nombreStations, 0)}
          </p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Chargement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntreprises.map(entreprise => (
            <div key={entreprise.id} className="relative">
              {entreprise.statut === 'attente_validation' && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <Clock className="h-3 w-3" />
                    En attente
                  </span>
                </div>
              )}
              <EntrepriseCard entreprise={entreprise} />
              {entreprise.statut === 'attente_validation' && isAdminCentral && (
                <div className="flex gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    onClick={() => handleValidateEntreprise(entreprise.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1 font-bold text-xs"
                    onClick={() => handleRejectEntreprise(entreprise.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Rejeter
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredEntreprises.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune entreprise trouvée</p>
          <p className="text-sm">Modifiez vos filtres</p>
        </div>
      )}

      {/* Dialog création - avec scroll et footer sticky */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Nouvelle entreprise</DialogTitle>
            <DialogDescription>
              Renseignez les informations principales de l’entreprise.
            </DialogDescription>
          </DialogHeader>

          {/* Zone scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo (optionnel)</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Prévisualisation" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/gif"
                      onChange={handleLogoChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG ou GIF – max 2 Mo
                    </p>
                  </div>
                </div>
              </div>

              {/* Nom */}
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: TotalEnergies Guinée"
                />
              </div>

              {/* Sigle */}
              <div className="space-y-2">
                <Label>Sigle *</Label>
                <Input
                  value={formData.sigle}
                  onChange={e => setFormData({ ...formData, sigle: e.target.value })}
                  placeholder="Ex: TOTAL"
                />
              </div>

              {/* Type + Région */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v: 'compagnie' | 'distributeur') =>
                      setFormData({ ...formData, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compagnie">Compagnie</SelectItem>
                      <SelectItem value="distributeur">Distributeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Région *</Label>
                  <Select
                    value={formData.region}
                    onValueChange={v => setFormData({ ...formData, region: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Agrément */}
              <div className="space-y-2">
                <Label>N° agrément</Label>
                <Input
                  value={formData.numeroAgrement}
                  onChange={e => setFormData({ ...formData, numeroAgrement: e.target.value })}
                  placeholder="Ex: AGR-2026-001"
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input
                    value={formData.contactNom}
                    onChange={e => setFormData({ ...formData, contactNom: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.contactTelephone}
                    onChange={e => setFormData({ ...formData, contactTelephone: e.target.value })}
                    placeholder="+224 6XX XX XX XX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@entreprise.gn"
                />
              </div>

              {/* Quotas Initial */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-emerald-700">Quota Essence (L) *</Label>
                  <Input
                    type="number"
                    value={formData.quota_essence}
                    onChange={e => setFormData({ ...formData, quota_essence: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-700">Quota Gasoil (L) *</Label>
                  <Input
                    type="number"
                    value={formData.quota_gasoil}
                    onChange={e => setFormData({ ...formData, quota_gasoil: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer sticky */}
          <DialogFooter className="sticky bottom-0 bg-background px-6 py-4 border-t mt-auto">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveEntreprise}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}