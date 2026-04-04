import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Upload, Building2, MapPin, Phone, Mail, Fuel, User, ShieldCheck, Lock, ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logUpdateResource } from '@/lib/auditLog';
import { cn } from '@/lib/utils';

// Import local logos for fallback
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

const localLogoMapping: Record<string, string> = {
  TOTAL: logoTotal, TotalEnergies: logoTotal, TO: logoTotal,
  SHELL: logoShell, VIVO: logoShell, SH: logoShell,
  TMI: logoTMI, TM: logoTMI,
  KP: logoKP,
};

interface EntrepriseInfo {
  id: string;
  nom: string;
  sigle: string;
  type?: string;
  numero_agrement?: string;
  region?: string;
  statut?: string;
  logo_url?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  contact_nom?: string;
  contact_telephone?: string;
  contact_email?: string;
  representant_nom?: string;
  representant_telephone?: string;
  representant_email?: string;
  created_at?: string;
  updated_at?: string;
}

interface StationRow {
  id: string;
  nom: string;
  code: string;
  ville: string;
  region: string;
  statut: string;
  stock_essence: number;
  stock_gasoil: number;
  capacite_essence: number;
  capacite_gasoil: number;
}

// Fields that responsable_entreprise CAN edit
const EDITABLE_FIELDS_RESPONSABLE: (keyof EntrepriseInfo)[] = [
  'email', 'telephone', 'adresse', 'ville',
  'contact_nom', 'contact_telephone', 'contact_email',
  'representant_nom', 'representant_telephone', 'representant_email'
];

// Fields that are READ-ONLY for responsable_entreprise
const READONLY_FIELDS_RESPONSABLE: (keyof EntrepriseInfo)[] = [
  'nom', 'sigle', 'type', 'numero_agrement', 'region', 'statut'
];

export default function EntrepriseInfoPage() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [entreprise, setEntreprise] = useState<EntrepriseInfo | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<EntrepriseInfo>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const isSuperAdmin = role === 'super_admin';
  const isResponsable = role === 'responsable_entreprise';

  useEffect(() => {
    if (isResponsable && profile?.entreprise_id) {
      fetchEntrepriseInfo(profile.entreprise_id);
    } else if (isSuperAdmin && profile?.entreprise_id) {
      fetchEntrepriseInfo(profile.entreprise_id);
    }
  }, [profile?.entreprise_id, role]);

  const fetchEntrepriseInfo = async (entId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id', entId)
        .single();

      if (error) throw error;

      setEntreprise(data);
      setFormData(data);

      // Fetch stations
      const { data: stData } = await supabase
        .from('stations')
        .select('id, nom, code, ville, region, statut, stock_essence, stock_gasoil, capacite_essence, capacite_gasoil')
        .eq('entreprise_id', entId)
        .order('nom');

      setStations(stData || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les informations de l\'entreprise',
      });
    } finally {
      setLoading(false);
    }
  };

  const canEditField = (field: keyof EntrepriseInfo): boolean => {
    if (isSuperAdmin) return true;
    if (isResponsable) return EDITABLE_FIELDS_RESPONSABLE.includes(field);
    return false;
  };

  const handleInputChange = (field: keyof EntrepriseInfo, value: string) => {
    if (!canEditField(field)) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Fichier trop volumineux', description: 'Max 2 Mo.' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!entreprise?.id) return;
    setSaving(true);
    try {
      // Build update payload — only editable fields
      const allowedFields = isSuperAdmin
        ? Object.keys(formData)
        : EDITABLE_FIELDS_RESPONSABLE;

      const updatePayload: Record<string, any> = {};
      allowedFields.forEach(field => {
        const key = field as keyof EntrepriseInfo;
        if (formData[key] !== undefined && formData[key] !== entreprise[key]) {
          updatePayload[key] = formData[key];
        }
      });

      // Handle logo upload
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: false, contentType: logoFile.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
          updatePayload.logo_url = urlData.publicUrl;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        toast({ title: 'Info', description: 'Aucune modification détectée.' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('entreprises')
        .update(updatePayload)
        .eq('id', entreprise.id);

      if (error) throw error;

      await logUpdateResource('entreprises', entreprise.nom, updatePayload, entreprise.id);

      toast({ title: 'Succès', description: 'Informations mises à jour avec succès.' });
      setEntreprise({ ...entreprise, ...updatePayload } as EntrepriseInfo);
      setFormData(prev => ({ ...prev, ...updatePayload }));
      setHasChanges(false);
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(entreprise || {});
    setHasChanges(false);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const getLogoSrc = () => {
    if (logoPreview) return logoPreview;
    if (entreprise?.logo_url) return entreprise.logo_url;
    if (entreprise?.sigle && localLogoMapping[entreprise.sigle]) return localLogoMapping[entreprise.sigle];
    return null;
  };

  const getStockPercent = (current: number, capacity: number) => {
    if (!capacity || capacity <= 0) return 0;
    return Math.round((current / capacity) * 100);
  };

  const getStockColor = (percent: number) => {
    if (percent < 10) return 'bg-red-500';
    if (percent < 25) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStockTextColor = (percent: number) => {
    if (percent < 10) return 'text-red-600';
    if (percent < 25) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const stationStatusStyles: Record<string, string> = {
    ouverte: 'bg-emerald-100 text-emerald-700',
    fermee: 'bg-red-100 text-red-700',
    en_travaux: 'bg-amber-100 text-amber-700',
    attente_validation: 'bg-blue-100 text-blue-700',
  };

  const stationStatusLabels: Record<string, string> = {
    ouverte: 'Ouverte',
    fermee: 'Fermée',
    en_travaux: 'En travaux',
    attente_validation: 'En attente',
  };

  if (loading) {
    return (
      <DashboardLayout title="Mon Entreprise" subtitle="Gestion des informations">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!entreprise) {
    return (
      <DashboardLayout title="Mon Entreprise" subtitle="Gestion des informations">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Aucune entreprise associée à votre compte</p>
            <p className="text-sm text-muted-foreground mt-1">Contactez l'administrateur pour associer votre compte à une entreprise.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const logoSrc = getLogoSrc();

  // ─── Editable field component ───
  const EditableField = ({
    field,
    label,
    type = 'text',
    icon: Icon,
    placeholder,
  }: {
    field: keyof EntrepriseInfo;
    label: string;
    type?: string;
    icon?: React.ElementType;
    placeholder?: string;
  }) => {
    const editable = canEditField(field);
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
          {!editable && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent>Champ protégé — seul l'administrateur peut le modifier</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Label>
        <Input
          id={field}
          type={type}
          value={(formData[field] as string) || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          disabled={!editable}
          placeholder={placeholder}
          className={cn(
            "h-10",
            !editable && "bg-muted/50 cursor-not-allowed opacity-70 border-dashed"
          )}
        />
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Mon Entreprise"
      subtitle="Gérez les informations et suivez vos stations"
    >
      {/* ── Unsaved changes alert ── */}
      {hasChanges && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>Vous avez des modifications non sauvegardées.</span>
            <div className="flex gap-2 ml-4">
              <Button size="sm" variant="outline" onClick={handleCancel}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Permission notice for responsable ── */}
      {isResponsable && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>Responsable d'entreprise</strong> — Vous pouvez modifier les coordonnées de contact, l'adresse et le représentant.
            Les informations officielles (nom, sigle, type, agrément) sont protégées.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN: Company identity ── */}
        <div className="space-y-6">
          {/* Logo & Identity card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 flex flex-col items-center text-center">
              {/* Logo */}
              <div className="relative group">
                <div className="h-28 w-28 rounded-2xl bg-white border-2 border-border shadow-lg flex items-center justify-center overflow-hidden">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={`Logo ${entreprise.sigle}`}
                      className="h-24 w-24 object-contain"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {entreprise.sigle?.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Upload overlay */}
                {canEditField('logo_url' as keyof EntrepriseInfo) && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="h-6 w-6 text-white" />
                    <input type="file" accept="image/png,image/jpeg,image/gif" onChange={handleLogoChange} className="hidden" />
                  </label>
                )}
              </div>

              <h2 className="text-xl font-bold mt-4">{entreprise.nom}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="font-semibold">{entreprise.sigle}</Badge>
                {entreprise.statut && (
                  <Badge className={cn(
                    "text-[10px] font-semibold border-0",
                    entreprise.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                      entreprise.statut === 'suspendu' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                  )}>
                    {entreprise.statut === 'actif' ? '● Actif' : entreprise.statut === 'suspendu' ? '● Suspendu' : '● Fermé'}
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Type :</span>
                <span className="font-medium capitalize">{entreprise.type || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Agrément :</span>
                <span className="font-medium">{entreprise.numero_agrement || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Région :</span>
                <span className="font-medium">{entreprise.region || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Fuel className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Stations :</span>
                <span className="font-bold text-primary">{stations.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stations.filter(s => s.statut === 'ouverte').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Stations ouvertes</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {stations.filter(s => {
                    const ep = getStockPercent(s.stock_essence, s.capacite_essence);
                    const gp = getStockPercent(s.stock_gasoil, s.capacite_gasoil);
                    return ep < 10 || gp < 10;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Stocks critiques</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Edit form + Stations ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Editable Information */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Coordonnées & Contact
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isResponsable
                      ? 'Modifiez les coordonnées de contact de votre entreprise'
                      : 'Toutes les informations sont modifiables'}
                  </CardDescription>
                </div>
                {hasChanges && (
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Enregistrer
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Official info (read-only for responsable) */}
              {isResponsable && (
                <>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Informations officielles (lecture seule)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <EditableField field="nom" label="Nom" icon={Building2} />
                      <EditableField field="sigle" label="Sigle" />
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Contact entreprise */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  Contact de l'entreprise
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="email" label="Email" type="email" icon={Mail} placeholder="contact@entreprise.gn" />
                  <EditableField field="telephone" label="Téléphone" icon={Phone} placeholder="+224 6XX XX XX XX" />
                </div>
              </div>

              <Separator />

              {/* Adresse */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Adresse
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <EditableField field="adresse" label="Adresse complète" icon={MapPin} placeholder="Ex: Avenue de la République" />
                  </div>
                  <EditableField field="ville" label="Ville" placeholder="Ex: Conakry" />
                  <EditableField field="region" label="Région" icon={MapPin} placeholder="Ex: Conakry" />
                </div>
              </div>

              <Separator />

              {/* Représentant */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Représentant légal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditableField field="representant_nom" label="Nom complet" icon={User} placeholder="Prénom Nom" />
                  <EditableField field="representant_telephone" label="Téléphone" icon={Phone} placeholder="+224 6XX XX XX XX" />
                  <EditableField field="representant_email" label="Email" type="email" icon={Mail} placeholder="representant@entreprise.gn" />
                </div>
              </div>

              {/* Contact ancien standard (contact_nom, etc.) */}
              <Separator />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  Personne de contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditableField field="contact_nom" label="Nom" icon={User} placeholder="Nom du contact" />
                  <EditableField field="contact_telephone" label="Téléphone" icon={Phone} placeholder="+224 6XX XX XX XX" />
                  <EditableField field="contact_email" label="Email" type="email" icon={Mail} placeholder="contact@entreprise.gn" />
                </div>
              </div>

              {/* Save actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Enregistrer les modifications</>
                  )}
                </Button>
                {hasChanges && (
                  <Button onClick={handleCancel} variant="outline">Annuler</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Stations List ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Fuel className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Mes stations</CardTitle>
                    <p className="text-sm text-muted-foreground">{stations.length} station{stations.length !== 1 ? 's' : ''} enregistrée{stations.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {stations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Aucune station enregistrée</p>
                  <p className="text-sm">Contactez l'administrateur pour ajouter des stations.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stations.map(station => {
                    const essencePercent = getStockPercent(station.stock_essence, station.capacite_essence);
                    const gasoilPercent = getStockPercent(station.stock_gasoil, station.capacite_gasoil);
                    const isCritical = essencePercent < 10 || gasoilPercent < 10;
                    const isWarning = !isCritical && (essencePercent < 25 || gasoilPercent < 25);

                    return (
                      <Link
                        key={station.id}
                        to={`/stations/${station.id}`}
                        className={cn(
                          "flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors group",
                          isCritical && "bg-red-50/30 dark:bg-red-950/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            isCritical ? "bg-red-100 dark:bg-red-900/30" :
                              isWarning ? "bg-amber-100 dark:bg-amber-900/30" :
                                "bg-emerald-100 dark:bg-emerald-900/30"
                          )}>
                            <Fuel className={cn(
                              "h-5 w-5",
                              isCritical ? "text-red-600" :
                                isWarning ? "text-amber-600" :
                                  "text-emerald-600"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{station.nom}</h4>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                                stationStatusStyles[station.statut] || 'bg-gray-100 text-gray-700'
                              )}>
                                {stationStatusLabels[station.statut] || station.statut}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{station.ville} • {station.code}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Stock bars */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="w-24">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-muted-foreground">Essence</span>
                                <span className={cn("text-[10px] font-bold", getStockTextColor(essencePercent))}>{essencePercent}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", getStockColor(essencePercent))} style={{ width: `${Math.min(essencePercent, 100)}%` }} />
                              </div>
                            </div>
                            <div className="w-24">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-muted-foreground">Gasoil</span>
                                <span className={cn("text-[10px] font-bold", getStockTextColor(gasoilPercent))}>{gasoilPercent}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", getStockColor(gasoilPercent))} style={{ width: `${Math.min(gasoilPercent, 100)}%` }} />
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
