import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, 
  Calendar, Building2, ShieldCheck, Clock, 
  CheckCircle2, AlertTriangle, FileUp, MoreVertical,
  Briefcase, Landmark, ExternalLink
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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
import { toast } from 'sonner';

interface ContratJuridique {
  id: string;
  titre: string;
  partenaire: string;
  type: 'commercial' | 'approvisionnement' | 'partenariat' | 'prestation';
  dateSignature: string;
  dateExpiration: string;
  statut: 'actif' | 'expire' | 'en_negociation' | 'resilie';
  montant?: string;
}

const mockContrats: ContratJuridique[] = [
  { id: 'C1', titre: 'Fourniture de Carburant Stratégique', partenaire: 'Trafigura', type: 'approvisionnement', dateSignature: '2025-01-15', dateExpiration: '2027-01-15', statut: 'actif', montant: '12.5M USD' },
  { id: 'C2', titre: 'Maintenance Système SIHG Phase 2', partenaire: 'Nexus Solutions', type: 'prestation', dateSignature: '2026-02-01', dateExpiration: '2028-02-01', statut: 'en_negociation' },
  { id: 'C3', titre: 'Partenariat Distribution Régionale', partenaire: 'Kamsar Petroleum', type: 'partenariat', dateSignature: '2024-05-20', dateExpiration: '2026-05-20', statut: 'actif' },
  { id: 'C4', titre: 'Accord de Stockage Temporaire', partenaire: 'TMI Logistics', type: 'commercial', dateSignature: '2023-11-10', dateExpiration: '2025-11-10', statut: 'expire' },
];

export default function ContratsPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'actif': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Actif</Badge>;
      case 'expire': return <Badge className="bg-red-100 text-red-700 border-red-200">Expiré</Badge>;
      case 'en_negociation': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Négociation</Badge>;
      case 'resilie': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Résilié</Badge>;
      default: return <Badge>{statut}</Badge>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Titre', 'Partenaire', 'Type', 'Signature', 'Expiration', 'Statut'];
    const rows = mockContrats.map(c => [c.id, c.titre, c.partenaire, c.type, c.dateSignature, c.dateExpiration, c.statut]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registre_contrats_${new Date().getFullYear()}.csv`;
    link.click();
    toast.success("Registre exporté avec succès");
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      toast.success(`Fichier détecté : ${e.dataTransfer.files[0].name}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      toast.success(`Fichier sélectionné : ${e.target.files[0].name}`);
    }
  };

  return (
    <DashboardLayout title="Gestion des Contrats" subtitle="Référentiel centralisé des accords et engagements contractuels">
      <div className="space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-card rounded-[2.5rem] border border-border shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-[120px]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-foreground tracking-tighter mb-2 uppercase">Référentiel Contrats</h2>
            <p className="text-muted-foreground max-w-lg text-sm font-medium leading-relaxed">
              Consultez, enregistrez et suivez la conformité de tous les accords signés par la Société Nationale des Pétroles.
            </p>
          </div>
          <div className="relative z-10 flex gap-3">
             <Button 
              variant="outline" 
              className="h-12 rounded-2xl gap-2 font-bold px-6"
              onClick={handleExportCSV}
             >
               <Download className="h-4 w-4" /> Exportation Registre
             </Button>
             {['directeur_juridique', 'juriste', 'super_admin'].includes(role || '') && (
               <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-indigo-600/20"
               >
                 <Plus className="h-4 w-4" /> Nouveau Contrat
               </Button>
             )}
          </div>
        </div>

        {/* Search & Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3 border-border bg-white/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/50 py-4 px-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Filtrer par partenaire ou titre du contrat..." 
                      className="border-none bg-transparent focus-visible:ring-0 w-96 font-medium text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                      <Filter className="h-4 w-4" />
                    </Button>
                 </div>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-muted/30 border-b border-border/50">
                       <th className="text-left font-black uppercase text-[10px] text-muted-foreground tracking-widest py-4 px-6">Contrat & Type</th>
                       <th className="text-left font-black uppercase text-[10px] text-muted-foreground tracking-widest py-4 px-6">Partenaire</th>
                       <th className="text-left font-black uppercase text-[10px] text-muted-foreground tracking-widest py-4 px-6">Validité</th>
                       <th className="text-left font-black uppercase text-[10px] text-muted-foreground tracking-widest py-4 px-6">Statut</th>
                       <th className="text-right font-black uppercase text-[10px] text-muted-foreground tracking-widest py-4 px-6">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border/30">
                     {mockContrats.filter(c => c.titre.toLowerCase().includes(search.toLowerCase()) || c.partenaire.toLowerCase().includes(search.toLowerCase())).map((c) => (
                       <tr key={c.id} className="hover:bg-muted/20 transition-all cursor-pointer group">
                         <td className="py-5 px-6">
                            <div className="flex flex-col">
                               <span className="font-bold text-foreground text-[13px] group-hover:text-indigo-600 transition-colors uppercase">{c.titre}</span>
                               <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60 flex items-center gap-1 mt-1">
                                 <Briefcase className="h-3 w-3" /> {c.type}
                               </span>
                            </div>
                         </td>
                         <td className="py-5 px-6">
                            <div className="flex items-center gap-2">
                               <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                 {c.partenaire[0]}
                               </div>
                               <span className="font-bold text-slate-700">{c.partenaire}</span>
                            </div>
                         </td>
                         <td className="py-5 px-6">
                            <div className="flex flex-col gap-1 text-[11px]">
                               <div className="flex items-center gap-2 font-medium text-slate-500">
                                 <Calendar className="h-3 w-3 text-emerald-500" /> Du {new Date(c.dateSignature).toLocaleDateString('fr-FR')}
                               </div>
                               <div className="flex items-center gap-2 font-medium text-slate-500">
                                 <Clock className="h-3 w-3 text-red-400" /> Au {new Date(c.dateExpiration).toLocaleDateString('fr-FR')}
                               </div>
                            </div>
                         </td>
                         <td className="py-5 px-6">
                            {getStatutBadge(c.statut)}
                         </td>
                         <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md"
                                onClick={() => toast.success("Préparation du téléchargement...")}
                               >
                                 <Download className="h-4 w-4 text-slate-400" />
                               </Button>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md"
                                onClick={() => toast.info("Ouverture du document sécurisé...")}
                               >
                                 <ExternalLink className="h-4 w-4 text-indigo-500" />
                               </Button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
             <Card className="border-border bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-500/20 rounded-3xl overflow-hidden p-6 relative">
                <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 italic">CONFORMITÉ CONTRACTUELLE</p>
                   </div>
                   <div>
                      <p className="text-4xl font-black tracking-tighter">94%</p>
                      <p className="text-xs font-bold text-indigo-100 mt-1 opacity-80 uppercase tracking-tight">Taux de validité globale</p>
                   </div>
                   <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: '94%' }} />
                   </div>
                </div>
             </Card>

             <Card className="border-border bg-white shadow-sm rounded-3xl overflow-hidden p-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes Expiration
                </h3>
                <div className="space-y-4">
                   {[1, 2].map(i => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 flex-shrink-0">
                              <Calendar className="h-4 w-4" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-900 truncate uppercase">Contrat #DSA-0{i}</p>
                              <p className="text-[10px] text-amber-600 font-bold italic">- {i === 1 ? '15' : '22'} jours</p>
                           </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                     </div>
                   ))}
                </div>
                <Button variant="link" className="w-full text-[10px] font-black uppercase text-indigo-600 mt-4 tracking-widest">
                  Voir tout le calendrier
                </Button>
             </Card>
          </div>
        </div>
      </div>

      {/* Add Contract Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-10 border-slate-200">
           <DialogHeader>
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                <FileUp className="h-7 w-7" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Enregistrer un Contrat</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 italic text-[11px] uppercase tracking-widest opacity-60">
                Certification numérique et archivage dans le SIHG
              </DialogDescription>
           </DialogHeader>

           <div className="grid grid-cols-2 gap-8 py-6">
              <div className="space-y-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titre de l'Accord</Label>
                    <Input placeholder="Ex: Contrat Approvisionnement Diesel 2026" className="h-12 rounded-2xl border-slate-200 bg-slate-50/50" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partenaire Contractuel</Label>
                    <Select>
                       <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50"><SelectValue placeholder="Partenaire" /></SelectTrigger>
                       <SelectContent className="rounded-2xl">
                          <SelectItem value="tot">TotalEnergies</SelectItem>
                          <SelectItem value="viv">Vivo Energy</SelectItem>
                          <SelectItem value="kam">Kamsar Petroleum</SelectItem>
                          <SelectItem value="tra">Trafigura</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Signature</Label>
                       <Input type="date" className="h-12 rounded-2xl border-slate-200 bg-slate-50/50" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Expiration</Label>
                       <Input type="date" className="h-12 rounded-2xl border-slate-200 bg-slate-50/50" />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Contrat</Label>
                    <Select defaultValue="commercial">
                       <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-2xl">
                          <SelectItem value="commercial">Contrat Commercial</SelectItem>
                          <SelectItem value="appro">Approvisionnement</SelectItem>
                          <SelectItem value="presta">Prestation de Service</SelectItem>
                          <SelectItem value="part">Accord de Partenariat</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload du document signé (PDF/Scanné)</Label>
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <div 
                      className={cn(
                        "h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group/upload",
                        isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                      )}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                       <FileUp className={cn(
                         "h-8 w-8 transition-all",
                         isDragging ? "text-indigo-600 scale-110" : "text-slate-300 group-hover/upload:text-indigo-500 group-hover/upload:-translate-y-1"
                       )} />
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                         {selectedFile ? selectedFile.name : "Glisser-déposer le fichier"}
                       </span>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-[10px] text-blue-800 leading-relaxed font-bold italic">
                      L'enregistrement d'un contrat engage la responsabilité de la DJ/C. Le document doit être visé et certifié.
                    </p>
                 </div>
              </div>
           </div>

           <DialogFooter className="pt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-14 rounded-2xl flex-1 font-bold">Annuler</Button>
              <Button 
                onClick={() => { 
                  if (!selectedFile) {
                    toast.error("Veuillez sélectionner un fichier");
                    return;
                  }
                  toast.success("Contrat enregistré et archivé avec succès"); 
                  setIsAddDialogOpen(false); 
                  setSelectedFile(null);
                }}
                className="h-14 rounded-2xl flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-600/20"
              >
                Valider & Archiver
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
  </svg>
)
