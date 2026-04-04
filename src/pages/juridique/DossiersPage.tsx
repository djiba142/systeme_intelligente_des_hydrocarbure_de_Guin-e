import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, Plus, Search, Filter, FileText, CheckCircle2, 
  XCircle, Clock, MoreHorizontal, Download, Eye, ExternalLink,
  Building2, ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DossierJuridique {
  id: string;
  numero: string;
  titre: string;
  type: string;
  direction: string;
  entreprise: string;
  dateCreation: string;
  statut: 'en_analyse' | 'en_verification' | 'valide' | 'rejete';
  priorite: 'haute' | 'normale' | 'basse';
}

const mockDossiers: DossierJuridique[] = [
  { id: '1', numero: 'DJ-2026-001', titre: 'Renouvellement Agrément Importation', type: 'Contrat', direction: 'Importation', entreprise: 'SONAP SARL', dateCreation: '2026-03-10', statut: 'en_analyse', priorite: 'haute' },
  { id: '2', numero: 'DJ-2026-002', titre: 'Audit Conformité Station Matoto', type: 'Conformité', direction: 'Services Aval', entreprise: 'TotalEnergies', dateCreation: '2026-03-12', statut: 'valide', priorite: 'normale' },
  { id: '3', numero: 'DJ-2026-003', titre: 'Litige Foncier Dixinn', type: 'Litige', direction: 'Logistique', entreprise: 'Vivo Energy', dateCreation: '2026-03-14', statut: 'en_verification', priorite: 'haute' },
  { id: '4', numero: 'DJ-2026-004', titre: 'Contrat Maintenance Dépôt', type: 'Contrat', direction: 'Logistique', entreprise: 'TMI Logistics', dateCreation: '2026-03-15', statut: 'rejete', priorite: 'normale' },
];

export default function DossiersPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tous');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [dossiers, setDossiers] = useState<DossierJuridique[]>(mockDossiers);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      const matchesSearch = d.titre.toLowerCase().includes(search.toLowerCase()) || d.numero.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'tous' || d.statut === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [search, activeTab, dossiers]);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'en_analyse': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">En Analyse</Badge>;
      case 'en_verification': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">En Vérification</Badge>;
      case 'valide': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Validé</Badge>;
      case 'rejete': return <Badge className="bg-red-100 text-red-700 border-red-200">Rejeté</Badge>;
      default: return <Badge>{statut}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Dossiers Juridiques" subtitle="Gestion et suivi des dossiers juridiques SONAP">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par numéro ou titre..." 
              className="pl-10 h-11 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl bg-white gap-2">
              <Filter className="h-4 w-4" /> Filtrer
            </Button>
            {['directeur_juridique', 'juriste', 'charge_conformite', 'super_admin'].includes(role || '') && (
              <Button 
                onClick={() => setIsNewDialogOpen(true)}
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="h-4 w-4" /> Nouveau Dossier
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1.5 bg-blue-500" />
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Analyse</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {dossiers.filter(d => d.statut === 'en_analyse').length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1.5 bg-amber-500" />
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Vérification</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {dossiers.filter(d => d.statut === 'en_verification').length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1.5 bg-emerald-500" />
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validés</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {dossiers.filter(d => d.statut === 'valide').length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1.5 bg-red-500" />
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejetés</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {dossiers.filter(d => d.statut === 'rejete').length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
          <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-2xl mb-6">
            <TabsTrigger value="tous" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest">Tous les Dossiers</TabsTrigger>
            <TabsTrigger value="en_analyse" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest">En Analyse</TabsTrigger>
            <TabsTrigger value="en_verification" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest">Vérification</TabsTrigger>
            <TabsTrigger value="valide" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest text-emerald-600">Validé</TabsTrigger>
            <TabsTrigger value="rejete" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest text-red-600">Rejeté</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Référence</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Titre / Objet</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Direction / Entité</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Date Création</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut</th>
                        <th className="text-right py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDossiers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <span className="font-black text-slate-900">{d.numero}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{d.titre}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-black">{d.type}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs">
                             <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-tight">
                                 <Building2 className="h-3 w-3" /> {d.entreprise}
                               </div>
                               <div className="text-slate-500 font-medium italic">{d.direction}</div>
                             </div>
                          </td>
                          <td className="py-4 px-6 text-xs font-medium text-slate-500">
                            {new Date(d.dateCreation).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-4 px-6">
                            {getStatutBadge(d.statut)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Actions Dossier</DropdownMenuLabel>
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <Eye className="h-4 w-4" /> Voir Détails
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <FileText className="h-4 w-4" /> Consulter Documents
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {role === 'directeur_juridique' && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer text-emerald-600 font-bold" onClick={() => toast.success("Dossier approuvé")}>
                                      <CheckCircle2 className="h-4 w-4" /> Approuver
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 font-bold" onClick={() => toast.error("Dossier rejeté")}>
                                      <XCircle className="h-4 w-4" /> Rejeter
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Dossier Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-8 border-slate-200">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <FolderOpen className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Initialiser un Dossier</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 italic">
              Veuillez renseigner les informations légales pour l'enregistrement du nouveau dossier.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Dossier</Label>
                <Select defaultValue="Contrat">
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Contrat">Contrat Commercial</SelectItem>
                    <SelectItem value="Conformité">Conformité Réglementaire</SelectItem>
                    <SelectItem value="Litige">Contentieux / Litige</SelectItem>
                    <SelectItem value="Licence">Licence d'Exploitation</SelectItem>
                    <SelectItem value="Autre">Autre Acte Juridique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entreprise Ciblée</Label>
                <Input placeholder="Ex: Shell Guinée" className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objet du Dossier / Titre</Label>
              <Input placeholder="Ex: Renouvellement de licence 2026-2027" className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direction Concernée</Label>
                <Select defaultValue="logistique">
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="importation">Direction Importation</SelectItem>
                    <SelectItem value="logistique">Direction Logistique</SelectItem>
                    <SelectItem value="dsa">Services Aval (DSA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priorité SIHG</Label>
                <Select defaultValue="normale">
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="haute">Haut Risque / Urgent</SelectItem>
                    <SelectItem value="normale">Standard</SelectItem>
                    <SelectItem value="basse">Information / Archivage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyse Initiale / Notes</Label>
              <Textarea 
                placeholder="Décrivez brièvement les enjeux juridiques..." 
                className="rounded-2xl border-slate-200 min-h-[100px] bg-slate-50/50"
              />
            </div>
            
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5" />
              <p className="text-[11px] text-indigo-700 font-medium leading-relaxed italic">
                La création de ce dossier générera une notification automatique à la direction concernée pour la soumission des pièces justificatives.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Annuler</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 flex-1 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
              onClick={() => {
                toast.success("Dossier initialisé avec succès");
                setIsNewDialogOpen(false);
              }}
            >
              Créer le Dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
