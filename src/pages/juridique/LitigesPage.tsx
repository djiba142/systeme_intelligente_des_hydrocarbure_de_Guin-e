import React, { useState } from 'react';
import { 
  Gavel, Plus, Search, Filter, Scale, 
  AlertTriangle, History, ExternalLink, 
  Calendar, Building2, Gavel as GavelIcon,
  MessageSquare, FileText, CheckCircle2,
  Clock, Bookmark, MoreHorizontal
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

interface LitigeJuridique {
  id: string;
  reference: string;
  titre: string;
  entreprise: string;
  type: 'civil' | 'commercial' | 'fiscal' | 'administratif';
  dateOuverture: string;
  statut: 'en_cours' | 'audience' | 'delibere' | 'clos';
  priorite: 'critique' | 'majeure' | 'normale';
}

const mockLitiges: LitigeJuridique[] = [
  { id: 'L1', reference: 'LIT-2026-001', titre: 'Recouvrement Impayé Redevance', entreprise: 'Kamsar Petroleum', type: 'commercial', dateOuverture: '2026-01-10', statut: 'en_cours', priorite: 'critique' },
  { id: 'L2', reference: 'LIT-2026-004', titre: 'Contestation Taxe Portuaire', entreprise: 'Vivo Energy', type: 'fiscal', dateOuverture: '2026-02-15', statut: 'audience', priorite: 'majeure' },
  { id: 'L3', reference: 'LIT-2025-098', titre: 'Litige Foncier Dépôt Kamsar', entreprise: 'SONAP SARL', type: 'administratif', dateOuverture: '2025-11-20', statut: 'delibere', priorite: 'normale' },
  { id: 'L4', reference: 'LIT-2025-056', titre: 'Conflit Travail Ex-Salarié', entreprise: 'TotalEnergies', type: 'civil', dateOuverture: '2025-08-05', statut: 'clos', priorite: 'normale' },
];

export default function LitigesPage() {
  const [search, setSearch] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'commercial',
    urgence: 'normale',
    partie: '',
    objet: '',
    sommaire: ''
  });

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'en_cours': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">En Cours</Badge>;
      case 'audience': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase font-black text-[9px]">Audience Fixée</Badge>;
      case 'delibere': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">En Délibéré</Badge>;
      case 'clos': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Dossier Clos</Badge>;
      default: return <Badge>{statut}</Badge>;
    }
  };

  const getPrioriteIcon = (prio: string) => {
    switch (prio) {
      case 'critique': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'majeure': return <AlertTriangle className="h-3 w-3 text-amber-500" />;
      default: return <Bookmark className="h-3 w-3 text-slate-400" />;
    }
  };

  const handleCreateLitige = () => {
    if (!formData.partie || !formData.objet) {
      toast.error("Veuillez remplir les informations obligatoires");
      return;
    }
    toast.success("Contentieux enregistré dans le Grand Livre", {
      description: `Affaire : ${formData.objet} vs ${formData.partie}`
    });
    setIsNewDialogOpen(false);
    setFormData({ type: 'commercial', urgence: 'normale', partie: '', objet: '', sommaire: '' });
  };

  return (
    <DashboardLayout title="Contentieux & Litiges" subtitle="Suivi des affaires juridiques et procédures contentieuses">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-card border border-border rounded-[2.5rem] shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full -mr-40 -mt-40 blur-[100px]" />
           <div className="relative z-10 flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white shadow-2xl">
                 <GavelIcon className="h-8 w-8" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase mb-1">Registre des Litiges</h2>
                 <p className="text-muted-foreground text-sm font-medium italic opacity-80">Protection des intérêts de la SONAP et gestion des procédures judiciaires.</p>
              </div>
           </div>
           <Button 
            onClick={() => setIsNewDialogOpen(true)}
            className="relative z-10 h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white gap-3 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/10"
           >
              <Plus className="h-4 w-4" /> Ouvrir un Contentieux
           </Button>
        </div>

        {/* Content Tabs / Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Rechercher par référence, entreprise ou objet..." 
                      className="pl-10 h-10 rounded-xl border-slate-200 bg-white shadow-sm font-medium text-xs"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
                 <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 font-bold text-xs bg-white border-slate-200">
                    <Filter className="h-4 w-4" /> Filtres
                 </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {mockLitiges.filter(l => l.titre.toLowerCase().includes(search.toLowerCase()) || l.entreprise.toLowerCase().includes(search.toLowerCase()) || l.reference.toLowerCase().includes(search.toLowerCase())).map((l) => (
                   <Card key={l.id} className="border-border hover:shadow-xl hover:border-slate-300 transition-all rounded-[2rem] overflow-hidden group cursor-pointer bg-white">
                      <CardHeader className="pb-4 border-b border-slate-50">
                         <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-200">
                               {l.reference}
                            </Badge>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-tight text-slate-500">
                               {getPrioriteIcon(l.priorite)} {l.priorite}
                            </div>
                         </div>
                      </CardHeader>
                      <CardContent className="pt-5 space-y-4">
                         <div className="space-y-1">
                            <CardTitle className="text-md font-black uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{l.titre}</CardTitle>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Building2 className="h-3.5 w-3.5 text-slate-400" /> {l.entreprise}
                            </div>
                         </div>

                         <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.1em]">Statut Actuel</span>
                               {getStatutBadge(l.statut)}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.1em]">Bilan Temporel</span>
                               <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 italic">
                                  <Clock className="h-3 w-3" /> {new Date(l.dateOuverture).toLocaleDateString('fr-FR')}
                               </span>
                            </div>
                         </div>

                         <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="flex-1 rounded-xl h-10 gap-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                              onClick={(e) => { e.stopPropagation(); toast.info(`Chargement du dossier ${l.reference}...`); }}
                            >
                               <FileText className="h-4 w-4" /> Dossier
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 rounded-xl h-10 gap-2 text-xs font-bold bg-slate-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-100 shadow-sm"
                              onClick={(e) => { e.stopPropagation(); toast.info(`Consultation de la décision pour ${l.reference}...`); }}
                            >
                               <MessageSquare className="h-4 w-4" /> Décision
                            </Button>
                         </div>
                      </CardContent>
                   </Card>
                 ))}
              </div>
           </div>

           {/* Sidebar Statistics */}
           <div className="space-y-6">
              <Card className="border-border shadow-md rounded-[2rem] overflow-hidden bg-slate-900 text-white p-6 relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl -mr-10 -mt-10" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 italic flex items-center gap-2">
                    <Scale className="h-4 w-4 text-indigo-400" /> Bilan Contentieux
                 </h3>
                 <div className="space-y-8">
                    <div className="flex items-end justify-between">
                       <p className="text-4xl font-black tracking-tighter">04</p>
                       <p className="text-[10px] font-black uppercase text-slate-400 text-right">Affaires en Cours</p>
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                          <span className="text-slate-400">Taux de succès</span>
                          <span className="text-indigo-400">76%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '76%' }} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                          <p className="text-lg font-black text-emerald-400">12</p>
                          <p className="text-[8px] font-black uppercase opacity-60">Gagnées</p>
                       </div>
                       <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                          <p className="text-lg font-black text-red-400">02</p>
                          <p className="text-[8px] font-black uppercase opacity-60">Perdues</p>
                       </div>
                    </div>
                 </div>
              </Card>

              <Card className="border-border shadow-sm rounded-[2rem] overflow-hidden bg-white p-6">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-500" /> Audiences à Venir
                 </h3>
                 <div className="space-y-4">
                    {[
                      { date: "22/03", titre: "Affaire Kamsar", court: "TPI Kaloum" },
                      { date: "28/03", titre: "Contentieux Fiscal", court: "Cour d'Appel" },
                    ].map((a, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                         <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center font-black group-hover:text-indigo-600">
                            <span className="text-[8px] text-slate-400 leading-none">MAR</span>
                            <span className="text-xs leading-none mt-1">{a.date.split('/')[0]}</span>
                         </div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{a.titre}</p>
                            <p className="text-[10px] text-slate-500 font-bold italic mt-0.5">{a.court}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>
        </div>
      </div>

      {/* New Litige Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 border-slate-200 shadow-3xl">
           <DialogHeader>
              <div className="h-16 w-16 rounded-[1.5rem] bg-red-50 flex items-center justify-center text-red-600 mb-6 shadow-sm border border-red-100">
                 <GavelIcon className="h-8 w-8" />
              </div>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight">Ouvrir un Contentieux</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 italic text-[11px] uppercase tracking-widest opacity-60">
                 Initialisation d'une procédure judiciaire ou pré-contentieuse
              </DialogDescription>
           </DialogHeader>

           <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Litige</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                       <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50">
                          <SelectValue placeholder="Nature" />
                       </SelectTrigger>
                       <SelectContent className="rounded-2xl">
                          <SelectItem value="civil">Droit Civil</SelectItem>
                          <SelectItem value="commercial">Droit Commercial</SelectItem>
                          <SelectItem value="fiscal">Droit Fiscal</SelectItem>
                          <SelectItem value="administratif">Contentieux Administratif</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Degré d'Urgence</Label>
                    <Select value={formData.urgence} onValueChange={(v) => setFormData({...formData, urgence: v})}>
                       <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="rounded-2xl">
                          <SelectItem value="critique" className="text-red-600 font-bold">Critique / Référé</SelectItem>
                          <SelectItem value="majeure">Affaire Majeure</SelectItem>
                          <SelectItem value="normale">Standard</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entreprise / Partie Adverse</Label>
                 <Input 
                  placeholder="Ex: Bureau des Douanes de Conakry" 
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold" 
                  value={formData.partie}
                  onChange={(e) => setFormData({...formData, partie: e.target.value})}
                 />
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objet du Différend</Label>
                 <Input 
                  placeholder="Titre explicatif de l'affaire" 
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold" 
                  value={formData.objet}
                  onChange={(e) => setFormData({...formData, objet: e.target.value})}
                 />
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sommaire Préliminaire</Label>
                 <Textarea 
                   placeholder="Exprimez les faits et les enjeux juridiques immédiats..." 
                   className="rounded-3xl border-slate-200 min-h-[120px] bg-slate-50/50 p-6 text-sm font-medium"
                   value={formData.sommaire}
                   onChange={(e) => setFormData({...formData, sommaire: e.target.value})}
                 />
              </div>
           </div>

           <DialogFooter className="pt-6">
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} className="h-14 rounded-2xl flex-1 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 border-slate-200">Annuler</Button>
              <Button 
                onClick={handleCreateLitige}
                className="h-14 rounded-2xl flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/10"
              >
                Engager la Procédure
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
