import React, { useState, useRef } from 'react';
import { 
  History, Search, Filter, Download, FileText, 
  Folder, FolderOpen, MoreVertical, FileUp,
  ShieldCheck, LayoutGrid, List, Trash2, 
  Share2, Archive, Eye, Lock, HardDrive,
  CheckCircle2, AlertTriangle, Info, Clock, Building2,
  Gavel, Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DocArchive {
  id: string;
  nom: string;
  type: string;
  categorie: 'licence' | 'contrat' | 'reglementaire' | 'archive_litige';
  dateAjout: string;
  taille: string;
  entreprise?: string;
  certifie: boolean;
}

const mockArchives: DocArchive[] = [
  { id: 'D1', nom: 'Licence_Import_Total_2026.pdf', type: 'PDF', categorie: 'licence', dateAjout: '2026-01-20', taille: '2.4 MB', entreprise: 'TotalEnergies', certifie: true },
  { id: 'D2', nom: 'Contrat_Navire_Trafigura_signed.pdf', type: 'PDF', categorie: 'contrat', dateAjout: '2026-03-05', taille: '4.8 MB', entreprise: 'Trafigura', certifie: true },
  { id: 'D3', nom: 'Decret_Loi_Petroliere_2025.pdf', type: 'PDF', categorie: 'reglementaire', dateAjout: '2025-12-15', taille: '1.2 MB', certifie: false },
  { id: 'D4', nom: 'Jugement_Kamsar_Petroleum_044.pdf', type: 'PDF', categorie: 'archive_litige', dateAjout: '2025-11-10', taille: '3.1 MB', entreprise: 'Kamsar Petroleum', certifie: true },
];

export default function ArchivesPage() {
  const { role } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2500)),
      {
        loading: 'Calcul des empreintes SHA-256 du registre...',
        success: () => {
          setIsVerifying(false);
          return 'Intégrité du registre confirmée. Aucun document altéré.';
        },
        error: 'Échec de la vérification.',
      }
    );
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          loading: `Chiffrement et archivage de ${fileName}...`,
          success: `Document ${fileName} sécurisé dans le coffre-fort.`,
          error: 'Échec de l\'archivage.',
        }
      );
    }
  };

  return (
    <DashboardLayout title="Archives & Documents" subtitle="Générateur de confiance documentaire et archivage sécurisé SIHG">
      <div className="space-y-6">
        {/* Storage Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="border-border bg-white shadow-xl rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-indigo-500/30 transition-all cursor-pointer">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                   <HardDrive className="h-3 w-3 text-indigo-500" /> Stockage Utilisé
                 </p>
                 <p className="text-3xl font-black text-slate-900 tracking-tighter">14.2 GB</p>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span className="text-indigo-600">62%</span> de la capacité Cloud DJ/C
                 </div>
              </div>
              <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                 <Archive className="h-8 w-8" />
              </div>
           </Card>
           
           <Card className="border-border bg-white shadow-xl rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                   <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Documents Certifiés
                 </p>
                 <p className="text-3xl font-black text-slate-900 tracking-tighter">1,280</p>
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">+12 cette semaine</p>
              </div>
              <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                 <ShieldCheck className="h-8 w-8" />
              </div>
           </Card>

           <Card className="border-border bg-slate-900 text-white shadow-xl rounded-[2.5rem] p-8 overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-indigo-500/20 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2 text-indigo-400">
                    <Lock className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hautement Sécurisé</p>
                 </div>
                 <p className="text-xs font-medium leading-relaxed opacity-70 italic text-[11px]">
                   Toute archive est verrouillée avec signature numérique SHA-256 certifiée par le SIHG Hub.
                 </p>
                 <Button 
                  disabled={isVerifying}
                  onClick={handleVerifyIntegrity}
                  className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white text-[9px] font-black uppercase tracking-widest border border-white/5"
                 >
                   {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                   Vérifier Intégrité Registre
                 </Button>
              </div>
           </Card>
        </div>

        {/* File Manager Section */}
        <Card className="border-border shadow-xl rounded-[3rem] overflow-hidden bg-white min-h-[600px] flex flex-col">
           <CardHeader className="bg-slate-50 border-b border-border/50 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                 <div className="space-y-1">
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Coffre-fort Digital</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400 italic flex items-center gap-2 uppercase tracking-widest opacity-60">
                       <Folder className="h-3 w-3" /> SIHG_LOCAL_STORAGE / JURIDIQUE_ROOT
                    </CardDescription>
                 </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Rechercher un document..." 
                      className="pl-10 h-11 w-64 rounded-2xl border-slate-200 bg-white text-xs font-medium shadow-inner"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
                 <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
                    <Button 
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('list')}
                      className={cn("h-9 w-9 p-0 rounded-xl", viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500')}
                    >
                       <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('grid')}
                      className={cn("h-9 w-9 p-0 rounded-xl", viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-500')}
                    >
                       <LayoutGrid className="h-4 w-4" />
                    </Button>
                 </div>
                 <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileImport}
                 />
                 <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white gap-3 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl shadow-slate-900/10"
                 >
                    <FileUp className="h-4 w-4" /> Importer Archive
                 </Button>
              </div>
           </CardHeader>
           
           <CardContent className="flex-1 p-0 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar Navigation inside File Manager */}
              <div className="w-full md:w-64 border-r border-slate-100 bg-slate-50/30 p-6 space-y-8 flex-shrink-0">
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 opacity-70">Collections</h4>
                    <nav className="space-y-2">
                       {[
                         { icon: FolderOpen, name: 'Toutes les archives', count: 120, active: true },
                         { icon: ShieldCheck, name: 'Conformité', count: 45 },
                         { icon: FileText, name: 'Contrats Signés', count: 32 },
                         { icon: Gavel, name: 'Dossiers Litiges', count: 15 },
                         { icon: History, name: 'Historique SIHG', count: 28 },
                       ].map((item, i) => (
                         <div key={i} className={cn(
                           "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border border-transparent",
                           item.active ? "bg-white border-slate-200 shadow-sm text-indigo-600" : "text-slate-600 hover:bg-slate-100/50"
                         )}>
                            <div className="flex items-center gap-3">
                               <item.icon className={cn("h-4 w-4", item.active ? "text-indigo-500" : "text-slate-400")} />
                               <span className="text-[11px] font-bold">{item.name}</span>
                            </div>
                            <span className="text-[10px] font-black opacity-30">{item.count}</span>
                         </div>
                       ))}
                    </nav>
                 </div>

                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 opacity-70">Récents</h4>
                    <div className="space-y-3">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="flex items-center gap-3 p-2 group cursor-pointer">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-all shadow-sm">
                               <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[10px] font-black text-slate-700 truncate uppercase">Licence_DSA_2026</p>
                               <p className="text-[9px] text-slate-400 font-bold">Il y a 2h</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* File List / Grid area */}
              <div className="flex-1 p-8 overflow-y-auto">
                 {viewMode === 'list' ? (
                    <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                          <thead>
                             <tr className="text-left border-b border-slate-100">
                                <th className="py-4 font-black uppercase text-[10px] text-slate-300 tracking-widest">Nom du Document</th>
                                <th className="py-4 font-black uppercase text-[10px] text-slate-300 tracking-widest hidden md:table-cell">Catégorie</th>
                                <th className="py-4 font-black uppercase text-[10px] text-slate-300 tracking-widest hidden md:table-cell">Date d'Ajout</th>
                                <th className="py-4 font-black uppercase text-[10px] text-slate-300 tracking-widest hidden md:table-cell">Taille</th>
                                <th className="py-4 font-black uppercase text-[10px] text-slate-300 tracking-widest text-right">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {mockArchives.filter(doc => doc.nom.toLowerCase().includes(search.toLowerCase())).map((doc) => (
                               <tr key={doc.id} className="hover:bg-slate-50 transition-all cursor-pointer group">
                                  <td className="py-5">
                                     <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 transition-all">
                                           <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                           <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{doc.nom}</p>
                                           <div className="flex items-center gap-2 mt-1">
                                              {doc.entreprise && (
                                                <span className="text-[9px] font-black uppercase text-indigo-600/60 bg-indigo-50 px-1.5 rounded-md flex items-center gap-1">
                                                  <Building2 className="h-2.5 w-2.5" /> {doc.entreprise}
                                                </span>
                                              )}
                                              {doc.certifie && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                                           </div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-5 hidden md:table-cell">
                                     <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase text-slate-400 border-slate-200">
                                        {doc.categorie}
                                     </Badge>
                                  </td>
                                  <td className="py-5 hidden md:table-cell">
                                     <span className="text-xs font-bold text-slate-500 italic opacity-60">{new Date(doc.dateAjout).toLocaleDateString('fr-FR')}</span>
                                  </td>
                                  <td className="py-5 hidden md:table-cell">
                                     <span className="text-[10px] font-black text-slate-400">{doc.taille}</span>
                                  </td>
                                  <td className="py-5 text-right">
                                     <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-9 w-9 rounded-xl hover:bg-white hover:text-indigo-600 hover:shadow-md"
                                          onClick={() => toast.info(`Aperçu de ${doc.nom}...`)}
                                        >
                                           <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-9 w-9 rounded-xl hover:bg-white hover:text-indigo-600 hover:shadow-md"
                                          onClick={() => toast.success(`Téléchargement de ${doc.nom} en cours...`)}
                                        >
                                           <Download className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-9 w-9 rounded-xl hover:bg-white hover:text-red-500 hover:shadow-md"
                                          onClick={() => toast.error(`Impossible de supprimer ${doc.nom} sans autorisation DGA.`)}
                                        >
                                           <Trash2 className="h-4 w-4" />
                                        </Button>
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                       {mockArchives.map((doc) => (
                         <Card 
                            key={doc.id} 
                            className="border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all rounded-[1.5rem] p-5 group flex flex-col items-center text-center cursor-pointer relative overflow-hidden bg-white"
                            onClick={() => toast.info(`Détails de ${doc.nom}...`)}
                         >
                            {doc.certifie && <div className="absolute top-2 right-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /></div>}
                            <div className="h-20 w-20 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-3 transition-all">
                               <FileText className="h-10 w-10" />
                            </div>
                            <p className="text-[11px] font-black text-slate-900 border-b border-transparent group-hover:border-indigo-600 group-hover:text-indigo-600 transition-all truncate w-full mb-1">{doc.nom}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.taille}</p>
                            <div className="mt-4 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-all">
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-50 text-indigo-600" onClick={(e) => { e.stopPropagation(); toast.success(`Téléchargement de ${doc.nom}...`); }}><Download className="h-4 w-4" /></Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500" onClick={(e) => { e.stopPropagation(); toast.error("Suppression verrouillée."); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                         </Card>
                       ))}
                    </div>
                 )}
              </div>
           </CardContent>
           
           <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
              <div className="flex items-center gap-2"><Lock className="h-3 w-3" /> Chiffrement AES-256</div>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Certification Hub SIHG</div>
           </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
