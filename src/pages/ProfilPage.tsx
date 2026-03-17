import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Camera,
  Save,
  Shield,
  Copy,
  Sun,
  Moon,
  Monitor,
  Droplets,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const themeOptions = [
  { value: 'light', label: 'Clair', icon: Sun, desc: 'Interface lumineuse' },
  { value: 'dark', label: 'Sombre', icon: Moon, desc: 'Interface sombre (mode nuit)' },
  { value: 'system', label: 'Système', icon: Monitor, desc: 'Suit les préférences OS' },
] as const;

export default function ProfilPage() {
  const { profile, role, user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  const handleSave = async () => {
    try {
      if (profile?.user_id) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName.trim(), phone: phone.trim() || null })
          .eq('user_id', profile.user_id);
      }
      toast({
        title: '✅ Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder.' });
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleColor: Record<string, string> = {
    super_admin: 'from-indigo-500 to-indigo-700',
    admin_etat: 'from-blue-500 to-blue-700',
    inspecteur: 'from-teal-500 to-teal-700',
    service_it: 'from-purple-500 to-purple-700',
    responsable_entreprise: 'from-amber-500 to-amber-700',
  };

  return (
    <DashboardLayout
      title="Mon Compte"
      subtitle="Gérez votre profil et vos préférences"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche : Carte profil + Mode sombre ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Profile Card */}
          <Card className="overflow-hidden">
            {/* Bannière pétrolière */}
            <div className={cn(
              "h-20 bg-gradient-to-br",
              role ? roleColor[role] : 'from-slate-600 to-slate-800',
              "relative"
            )}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
              <div className="absolute bottom-2 left-4 flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/80 font-medium tracking-wider uppercase">SIHG Guinée</span>
              </div>
            </div>

            <CardContent className="pt-0 pb-6">
              {/* Avatar centré qui chevauche la bannière */}
              <div className="flex flex-col items-center text-center -mt-10">
                <div className="relative mb-3">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className={cn(
                      "text-xl bg-gradient-to-br text-white font-bold",
                      role ? roleColor[role] : 'from-slate-600 to-slate-800'
                    )}>
                      {getInitials(profile?.full_name || user?.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <h3 className="text-lg font-bold">{profile?.full_name || 'Utilisateur'}</h3>
                <p className="text-sm text-muted-foreground mb-3">{profile?.email || user?.email}</p>

                {role && (
                  <Badge className={cn('text-xs text-white bg-gradient-to-r mb-4', roleColor[role])}>
                    {ROLE_LABELS[role]}
                  </Badge>
                )}

                <Separator className="my-2 w-full" />

                <div className="w-full text-left space-y-2.5 mt-2">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{profile?.email || user?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{profile.phone}</span>
                    </div>
                  )}
                  {profile?.entreprise_id && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Entreprise assignée</span>
                    </div>
                  )}
                  {profile?.station_id && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Station assignée</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte Mode Sombre */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                Apparence
              </CardTitle>
              <CardDescription className="text-xs">
                Choisissez votre thème d'affichage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {themeOptions.map(opt => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left",
                      isActive
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border bg-background hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0",
                      isActive ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isActive && "text-foreground")}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Colonne droite : Édition ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Infos personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informations Personnelles
              </CardTitle>
              <CardDescription>Modifier vos informations de compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom complet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+224 6XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-xs text-muted-foreground">ID Utilisateur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="userId"
                      value={user?.id || ''}
                      readOnly
                      className="bg-muted font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(user?.id || '');
                        toast({ title: 'ID copié !' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>

          {/* Rôle & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Rôle et Permissions
              </CardTitle>
              <CardDescription>
                Vos droits d'accès sur la plateforme SIHG
              </CardDescription>
            </CardHeader>
            <CardContent>
              {role ? (
                <div className="space-y-4">
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r text-white",
                    roleColor[role]
                  )}>
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{ROLE_LABELS[role]}</p>
                      <p className="text-xs text-white/80 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le rôle est attribué par un administrateur et ne peut pas être modifié par l'utilisateur.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-700">⚠️ Aucun rôle assigné</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Votre compte n'a pas encore de privilèges. Contactez un administrateur.
                    </p>
                    <p className="text-xs font-mono text-amber-600 mt-2 bg-amber-100 px-2 py-1 rounded">
                      ID: {user?.id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={async () => {
                      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', user?.id ?? '');
                      if (error) {
                        toast({ variant: 'destructive', title: 'Erreur RLS', description: error.message });
                      } else {
                        toast({
                          title: 'Vérification BD',
                          description: data?.length ? `Rôle trouvé: ${data[0].role}` : 'Aucun rôle trouvé en base',
                        });
                        if (data?.length && !role) window.location.reload();
                      }
                    }}
                  >
                    🔍 Vérifier mes permissions en direct
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
