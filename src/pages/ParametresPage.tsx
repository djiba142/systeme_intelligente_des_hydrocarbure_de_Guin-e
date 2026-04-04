import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  DollarSign,
  Save,
  RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function ParametresPage() {
  const { toast } = useToast();
  const { role } = useAuth();

  const [prixEssence, setPrixEssence] = useState('12000');
  const [prixGasoil, setPrixGasoil] = useState('12000');
  const [prixGPL, setPrixGPL] = useState('8500');

  const [seuilCritique, setSeuilCritique] = useState('10');
  const [seuilAlerte, setSeuilAlerte] = useState('25');

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    alertesCritiques: true,
    alertesWarning: true,
    rapports: false,
  });

  const handleSavePrices = () => {
    toast({
      title: "Prix mis à jour",
      description: "Les prix officiels ont été enregistrés avec succès.",
    });
  };

  const handleSaveThresholds = () => {
    toast({
      title: "Seuils mis à jour",
      description: "Les seuils d'alerte ont été enregistrés.",
    });
  };

  return (
    <DashboardLayout
      title="Paramètres"
      subtitle="Configuration de la plateforme SIHG"
    >
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="prix" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Prix
          </TabsTrigger>
          <TabsTrigger value="alertes" className="gap-2">
            <Bell className="h-4 w-4" />
            Alertes
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Paramètres Régionaux
                </CardTitle>
                <CardDescription>
                  Configuration de la langue et du format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Input value="Français" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <Input value="GMT (Conakry)" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Format de date</Label>
                  <Input value="JJ/MM/AAAA" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Input value="Franc Guinéen (GNF)" disabled />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Apparence
                </CardTitle>
                <CardDescription>
                  Personnalisation de l'interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    🌙 Le mode sombre est disponible dans <strong>Mon Compte</strong> → section Apparence.
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Animations</Label>
                    <p className="text-xs text-muted-foreground">
                      Activer les animations de l'interface
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sidebar compacte</Label>
                    <p className="text-xs text-muted-foreground">
                      Réduire la barre latérale par défaut
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prices Settings */}
        <TabsContent value="prix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Prix Officiels des Carburants
              </CardTitle>
              <CardDescription>
                Définir les prix de vente officiels (en GNF par litre)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {role !== 'super_admin' ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Seuls les administrateurs d'État peuvent modifier les prix officiels.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="prixEssence">Essence (Super)</Label>
                      <div className="relative">
                        <Input
                          id="prixEssence"
                          type="number"
                          value={prixEssence}
                          onChange={(e) => setPrixEssence(e.target.value)}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          GNF
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prixGasoil">Gasoil (Diesel)</Label>
                      <div className="relative">
                        <Input
                          id="prixGasoil"
                          type="number"
                          value={prixGasoil}
                          onChange={(e) => setPrixGasoil(e.target.value)}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          GNF
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prixGPL">GPL (Gaz)</Label>
                      <div className="relative">
                        <Input
                          id="prixGPL"
                          type="number"
                          value={prixGPL}
                          onChange={(e) => setPrixGPL(e.target.value)}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          GNF
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleSavePrices} className="gap-2">
                    <Save className="h-4 w-4" />
                    Enregistrer les prix
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Settings */}
        <TabsContent value="alertes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seuils d'Alerte</CardTitle>
                <CardDescription>
                  Configurer les seuils de déclenchement des alertes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seuilCritique">Seuil critique (%)</Label>
                  <Input
                    id="seuilCritique"
                    type="number"
                    value={seuilCritique}
                    onChange={(e) => setSeuilCritique(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerte rouge lorsque le stock passe en dessous
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seuilAlerte">Seuil d'alerte (%)</Label>
                  <Input
                    id="seuilAlerte"
                    type="number"
                    value={seuilAlerte}
                    onChange={(e) => setSeuilAlerte(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerte orange lorsque le stock passe en dessous
                  </p>
                </div>
                <Button onClick={handleSaveThresholds} className="gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer les seuils
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canaux de Notification</CardTitle>
                <CardDescription>
                  Choisir comment recevoir les alertes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Recevoir les alertes par email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS</Label>
                    <p className="text-xs text-muted-foreground">
                      Recevoir les alertes par SMS
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications Push</Label>
                    <p className="text-xs text-muted-foreground">
                      Alertes dans le navigateur
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="securite">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Système et Sécurité
              </CardTitle>
              <CardDescription>
                Paramètres avancés de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <h4 className="font-medium mb-2">Version du Système</h4>
                  <p className="text-sm text-muted-foreground">SIHG v1.0.0</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernière mise à jour: 01/02/2026
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <h4 className="font-medium mb-2">État de la Base de Données</h4>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-sm text-green-600">Opérationnelle</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernière synchronisation: il y a 2 min
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-4">
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Synchroniser les données
                </Button>
                <Button variant="outline" className="gap-2">
                  <Database className="h-4 w-4" />
                  Exporter la configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
