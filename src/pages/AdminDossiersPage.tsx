import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Plus, Search, Filter, FileText, CheckCircle2, 
  XCircle, Clock, MoreHorizontal, Download, Eye, 
  Building2, ArrowRight, ShieldCheck, AlertCircle,
  FileCheck, Shield, Activity, UserCheck, Archive, PenTool
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
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dossier, DossierStatus } from '@/types';

const STATUS_LABELS: Record<string, { label: string, color: string, icon: any }> = {
  recu: { label: 'Reçu (Papier)', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FolderOpen },
  incomplet: { label: 'Dossier Incomplet', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  numerise: { label: 'Numérisé', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
  analyse_technique: { label: 'Analyse Technique (DSA)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Activity },
  analyse_administrative: { label: 'Analyse Administrative (DA)', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileCheck },
  analyse_juridique: { label: 'Analyse Juridique (DJ/C)', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  approuve: { label: 'Approuvé (DG)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejete: { label: 'Rejeté', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: XCircle },
  archive: { label: 'Archivé', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Archive }
};

export default function AdminDossiersPage() {
  const { role, user } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tous');
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDossierDetailOpen, setIsDossierDetailOpen] = useState(false);
  const [newEntiteNom, setNewEntiteNom] = useState('');
  const [newEntiteType, setNewEntiteType] = useState('entreprise');
  const [newTypeDemande, setNewTypeDemande] = useState('agrement_entreprise');
  
  // Procedure Wizard States
  const [wizardStep, setWizardStep] = useState(1); // 1: Recu, 2: Pre-controle, 3: Numerisation, 4: Confirmation
  const [checklist, setChecklist] = useState({
    rccm: false,
    nif: false,
    statuts: false,
    photos: false,
    quittance: false
  });
  const [isComplete, setIsComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDossiers();
  }, []);

  async function fetchDossiers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Ensure we type-cast correctly and handle JSON fields
      const formattedData = (data as any[]).map(d => ({
        ...d,
        pieces_jointes: Array.isArray(d.pieces_jointes) ? d.pieces_jointes : []
      })) as Dossier[];
      
      setDossiers(formattedData);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des dossiers: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredDossiers = dossiers.filter(d => {
    const matchesSearch = d.entite_nom.toLowerCase().includes(search.toLowerCase()) || 
                         d.numero_dossier.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'tous' || d.statut === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleUpdateStatus = async (id: string, newStatus: DossierStatus) => {
    try {
      const isDSA = role?.includes('aval') || role?.includes('dsa') || role?.includes('distribution');
      const isAdminEtat = role === 'admin_etat' || role === 'super_admin';
      const isDG = ['directeur_general', 'directeur_adjoint', 'super_admin'].includes(role || '');

      const updateData: any = { 
        statut: newStatus,
        updated_at: new Date().toISOString()
      };

      // Traçabilité des signatures (Qui a validé quoi ?)
      if (isDSA && selectedDossier?.statut === 'numerise') {
        updateData.valide_par_dsa = user?.email;
        updateData.date_validation_dsa = new Date().toISOString();
      } 
      if (isAdminEtat && selectedDossier?.statut === 'analyse_administrative') {
        // Admin Etat is now responsible for the administrative stage previously held by DA
        updateData.updated_at = new Date().toISOString();
      }
      if (isDG && selectedDossier?.statut === 'analyse_juridique') {
        updateData.valide_par_dg = user?.email;
        updateData.date_validation_dg = new Date().toISOString();
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Dossier transféré : ${STATUS_LABELS[newStatus].label}`);
      fetchDossiers();
      if (selectedDossier?.id === id) {
        setSelectedDossier(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error: any) {
      toast.error("Erreur mise à jour: " + error.message);
    }
  };

  const getStatutBadge = (statut: DossierStatus) => {
    const s = STATUS_LABELS[statut] || { label: statut, color: 'bg-gray-100', icon: Clock };
    return (
      <Badge className={cn("gap-1.5 font-bold uppercase text-[9px] tracking-wider border", s.color)}>
        <s.icon className="h-3 w-3" />
        {s.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout 
      title="Workflow Administratif (SIHG)" 
      subtitle="Suivi complet des agréments, licences et dossiers SONAP"
    >
      <div className="space-y-6">
        {/* Main Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">SURVEILLANCE WORKFLOW</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] opacity-60">Système SIHG • Chaine de Décision SONAP</p>
          </div>
          <div className="flex items-center gap-3">
            {(role?.includes('administratif') || role?.includes('aval') || role?.includes('dsa') || role === 'super_admin') && (
              <Button 
                className="bg-slate-900 text-white rounded-[1.5rem] h-16 px-10 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/30 group transition-all active:scale-95"
                onClick={() => setIsNewDialogOpen(true)}
              >
                <Plus className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform" /> ENREGISTRER UN DOSSIER PHYSIQUE
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-24 bg-white/10 -skew-x-12 translate-x-12" />
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100 font-bold uppercase text-[10px] tracking-widest">Réception / Scan</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => ['recu', 'numerise', 'incomplet'].includes(d.statut)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-amber-500 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-100 font-bold uppercase text-[10px] tracking-widest">En Analyse (Multi-Dir)</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => ['analyse_technique', 'analyse_administrative', 'analyse_juridique'].includes(d.statut)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-emerald-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest">Approuvés / Valides</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => d.statut === 'approuve').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-slate-900 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Archivés</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => d.statut === 'archive').length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              placeholder="Rechercher par référence, société ou numéro de dossier..." 
              className="pl-12 h-14 rounded-2xl bg-slate-50/50 border-none font-bold text-slate-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-slate-50 border-none flex items-center justify-center p-0" onClick={fetchDossiers}>
              <Activity className={cn("h-6 w-6 text-slate-400", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Workflow Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
          <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-2xl mb-6 overflow-x-auto h-auto min-w-full md:min-w-0">
            <TabsTrigger value="tous" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Tous</TabsTrigger>
            <TabsTrigger value="recu" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">En Réception</TabsTrigger>
            <TabsTrigger value="numerise" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-blue-600 underline decoration-2">Numérisés</TabsTrigger>
            <TabsTrigger value="analyse_technique" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Tech (DSA)</TabsTrigger>
            <TabsTrigger value="analyse_administrative" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Admin (DA)</TabsTrigger>
            <TabsTrigger value="analyse_juridique" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-purple-600 italic">Legal (DJ/C)</TabsTrigger>
            <TabsTrigger value="approuve" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-emerald-600">Approuvés (DG)</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0 focus-visible:ring-0">
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Référence / Date</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Entité (Entreprise/Station)</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Type de Demande</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut Workflow</th>
                        <th className="text-right py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Chargement des dossiers...</td></tr>
                      ) : filteredDossiers.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Aucun dossier trouvé</td></tr>
                      ) : filteredDossiers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 tracking-tighter">{d.numero_dossier}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(d.date_soumission).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                                {d.entite_nom[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{d.entite_nom}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight italic">{d.entite_type}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {d.type_demande.replace(/_/g, ' ')}
                            </span>
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
                              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-2 py-1">Workflow Opérationnel</DropdownMenuLabel>
                                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" onClick={() => { setSelectedDossier(d); setIsDossierDetailOpen(true); }}>
                                  <Eye className="h-4 w-4 text-blue-500" /> Voir Dossier Complet
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="my-1" />
                                
                                {/* Transitions selon la hiérarchie SONAP */}
                                {d.statut === 'numerise' && ['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-blue-600" onClick={() => handleUpdateStatus(d.id, 'analyse_technique')}>
                                    <ArrowRight className="h-4 w-4" /> Transmettre pour Analyse Technique (DSA)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_technique' && ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-amber-600" onClick={() => handleUpdateStatus(d.id, 'analyse_administrative')}>
                                    <FileCheck className="h-4 w-4" /> Valider & Transférer à la Direction Admin (DA)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_administrative' && ['directeur_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-600" onClick={() => handleUpdateStatus(d.id, 'analyse_juridique')}>
                                    <Shield className="h-4 w-4" /> Valider & Transférer au Juridique (DJ)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_juridique' && ['admin_etat', 'directeur_administratif', 'directeur_general', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-purple-600" onClick={() => handleUpdateStatus(d.id, 'approuve')}>
                                    <PenTool className="h-4 w-4" /> Soumettre pour Branche DG (Signature)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'approuve' && ['directeur_general', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-600" onClick={() => handleUpdateStatus(d.id, 'archive')}>
                                    <Archive className="h-4 w-4" /> Archiver le Dossier (Traitement Terminé)
                                  </DropdownMenuItem>
                                )}

                                {['analyse_technique', 'analyse_administrative', 'analyse_juridique'].includes(d.statut) && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-600" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                    <XCircle className="h-4 w-4" /> Rejeter le Dossier
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'approuve' && ['gestionnaire_documentaire', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-slate-600" onClick={() => handleUpdateStatus(d.id, 'archive')}>
                                    <Archive className="h-4 w-4" /> Classer & Archiver
                                  </DropdownMenuItem>
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

      {/* Detail Modal */}
      <Dialog open={isDossierDetailOpen} onOpenChange={setIsDossierDetailOpen}>
        <DialogContent className="max-w-4xl p-0 border-none rounded-[2rem] overflow-hidden shadow-2xl">
          {selectedDossier && (
            <>
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <FolderOpen className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{selectedDossier.numero_dossier}</h2>
                      <p className="text-slate-400 text-sm font-medium">{selectedDossier.entite_nom} · {selectedDossier.type_demande.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Statut Actuel</p>
                    {getStatutBadge(selectedDossier.statut)}
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto">
                <div className="md:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                       <FileText className="h-3.5 w-3.5" /> Documents Justificatifs
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'rccm_url', name: 'Registre du Commerce (RCCM)', url: selectedDossier.rccm_url },
                        { id: 'nif_url', name: 'Numéro Identification Fiscale (NIF)', url: selectedDossier.nif_url },
                        { id: 'statuts_url', name: 'Statuts de l\'Entreprise', url: selectedDossier.statuts_url },
                        { id: 'autorisation_url', name: "Autorisation d'Exploitation", url: selectedDossier.autorisation_url }
                      ].map((doc, i) => (
                        <div key={i} className="flex flex-col p-4 rounded-2xl border border-slate-100 bg-slate-50/50 group hover:border-indigo-200 hover:bg-white transition-all gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">{doc.name}</span>
                            <div className="flex items-center gap-1">
                              {doc.url ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[8px] uppercase font-black">Prêt</Badge>
                              ) : (
                                <Badge className="bg-slate-200 text-slate-500 border-none text-[8px] uppercase font-black">Manquant</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {doc.url ? (
                              <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-[10px] font-bold gap-2">
                                <Eye className="h-3 w-3" /> Voir
                              </Button>
                            ) : (
                              <div className="flex-1 relative">
                                <Input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  accept=".pdf"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    toast.loading(`Numérisation de ${doc.name}...`);
                                    try {
                                      // Simulate upload for demo purposes as we don't have bucket setup in this environment
                                      const fakeUrl = `https://storage.sihg.gn/dossiers/${selectedDossier.id}/${doc.id}.pdf`;
                                      
                                      const { error } = await supabase
                                        .from('dossiers')
                                        .update({ [doc.id]: fakeUrl })
                                        .eq('id', selectedDossier.id);
                                        
                                      if (error) throw error;
                                      
                                      toast.dismiss();
                                      toast.success(`${doc.name} numérisé avec succès !`);
                                      setSelectedDossier(prev => prev ? { ...prev, [doc.id]: fakeUrl } : null);
                                      fetchDossiers();
                                    } catch (err: any) {
                                      toast.dismiss();
                                      toast.error("Erreur d'upload: " + err.message);
                                    }
                                  }}
                                />
                                <Button variant="outline" size="sm" className="w-full rounded-xl h-9 text-[10px] font-bold gap-2 border-dashed border-slate-300">
                                  <Plus className="h-3 w-3" /> Scanner / PDF
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Observations Direction</h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-sm text-slate-600 leading-relaxed">
                      {selectedDossier.observations || "Aucune observation particulière enregistrée pour le moment."}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  {/* Performance / Timeline Module */}
                  <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-6 flex items-center gap-2">
                       <ShieldCheck className="h-4 w-4" /> Traçabilité SIHG
                    </h4>
                    
                    <div className="space-y-6 relative ml-1">
                      <div className="absolute left-1.5 top-0 bottom-0 w-[2px] bg-slate-800" />
                      
                      {[
                        { label: 'Réception SONAP', key: 'recu', date: selectedDossier.date_soumission, icon: FolderOpen, color: 'text-slate-400' },
                        { label: 'Analyse DSA', key: 'valide_par_dsa', date: (selectedDossier as any).date_validation_dsa, icon: Activity, color: 'text-indigo-400' },
                        { label: 'Analyse Administrative', key: 'valide_par_da', date: (selectedDossier as any).date_validation_da, icon: FileCheck, color: 'text-amber-400' },
                        { label: 'Analyse Juridique/Legal', key: 'valide_par_djc', date: (selectedDossier as any).date_validation_djc, icon: Shield, color: 'text-purple-400' },
                        { label: 'Décision FINALE (DG)', key: 'valide_par_dg', date: (selectedDossier as any).date_validation_dg, icon: CheckCircle2, color: 'text-emerald-400' }
                      ].map((step, idx) => {
                        const isDone = step.key === 'recu' ? true : !!(selectedDossier as any)[step.key];
                        const stepDate = step.date ? new Date(step.date).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : null;

                        return (
                          <div key={idx} className="flex items-start gap-4 relative z-10 group">
                            <div className={cn(
                              "h-3 w-3 rounded-full mt-1 border-2 border-slate-900 ring-2 ring-offset-2 ring-offset-slate-900 transition-all duration-500",
                              isDone ? "bg-white ring-white/50" : "bg-slate-700 ring-transparent"
                            )} />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDone ? "text-white" : "text-slate-600")}>
                                  {step.label}
                                </span>
                                {isDone && (
                                  <Badge className="bg-white/5 text-[7px] text-slate-400 border-none px-1 h-3 font-mono">
                                    {stepDate}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                                {isDone ? `Action validée par ${(selectedDossier as any)[step.key] || 'Système'}` : "En attente de traitement"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Decision Guidance */}
                  <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 italic">
                    <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                      "Toute action dans le SIHG est enregistrée, horodatée et attribuée à votre profil. Veillez à la conformité des documents numérisés."
                    </p>
                  </div>
                </div>
              </div>

                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="rounded-xl px-8 font-bold h-12" onClick={() => setIsDossierDetailOpen(false)}>Fermer l'Aperçu</Button>
                  
                  {/* Décision Hiérarchique SONAP */}
                  <div className="p-1 bg-slate-100 rounded-2xl flex flex-col gap-1">
                    {/* Étape AVAL (DSA) - Détecte "aval", "dsa" ou "distribution" */}
                    {selectedDossier.statut === 'numerise' && (role?.includes('aval') || role?.includes('dsa') || role?.includes('distribution')) && (
                      <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20"
                        onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_technique')}
                      >
                        <Activity className="mr-2 h-4 w-4" /> Valider Analyse Technique (DSA)
                      </Button>
                    )}

                    {/* Étape ADMIN (DA) */}
                    {selectedDossier.statut === 'analyse_technique' && role?.includes('administratif') && (
                      <Button 
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-600/20"
                        onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_administrative')}
                      >
                        <FileCheck className="mr-2 h-4 w-4" /> Valider Analyse Administrative (DA)
                      </Button>
                    )}

                    {/* Étape JURIDIQUE (DJ) → Now handled by Admin Central */}
                    {selectedDossier.statut === 'analyse_administrative' && (role === 'admin_etat' || role === 'directeur_administratif' || role === 'super_admin') && (
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-600/20"
                        onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_juridique')}
                      >
                        <Shield className="mr-2 h-4 w-4" /> Valider Analyse Juridique (DJ)
                      </Button>
                    )}

                    {/* Étape DG (Signature) */}
                    {selectedDossier.statut === 'analyse_juridique' && (role === 'directeur_general' || role === 'super_admin') && (
                      <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1 rounded-xl h-14 font-black uppercase text-[10px] tracking-widest" onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}>REJETER</Button>
                        <Button 
                          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/30"
                          onClick={() => {
                            toast.info("Notification envoyée à l'entreprise : DOSSIER APPROUVÉ");
                            handleUpdateStatus(selectedDossier.id, 'approuve');
                          }}
                        >
                          APPROUVER & SIGNER (DG)
                        </Button>
                      </div>
                    )}

                    {/* Archivage Final */}
                    {selectedDossier.statut === 'approuve' && (role === 'directeur_general' || role === 'super_admin') && (
                      <Button 
                        className="bg-slate-900 hover:bg-black text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl"
                        onClick={() => handleUpdateStatus(selectedDossier.id, 'archive')}
                      >
                        <Archive className="mr-2 h-4 w-4" /> Clôturer & Archiver le Dossier
                      </Button>
                    )}
                  </div>
                  
                  {/* Actions de téléchargement (si approuvé) */}
                  {selectedDossier.statut === 'approuve' && (
                     <Button 
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest"
                      onClick={() => {
                        toast.success("Impression de l'Agrément / Licence en cours...");
                        window.open('https://bjcnvbrcyezswdrefzgh.supabase.co/storage/v1/object/public/templates/exemplaire_agrement_sihg.pdf', '_blank');
                      }}
                     >
                       <Download className="mr-2 h-4 w-4" /> Télécharger Agrément Signé
                     </Button>
                  )}
                </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Dossier Creation (Simplified for demo) */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl p-8 rounded-[2rem] border-none shadow-2xl">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step} 
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-700",
                  wizardStep >= step ? "bg-slate-900" : "bg-slate-100"
                )} 
              />
            ))}
          </div>

          <DialogHeader className="mb-6">
             <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
               <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm">{wizardStep}</div>
               {wizardStep === 1 && "1. RÉCEPTION PHYSIQUE"}
               {wizardStep === 2 && "2. PRÉ-CONTRÔLE (CHECKLIST)"}
               {wizardStep === 3 && "3. NUMÉRISATION (SCAN PDF)"}
               {wizardStep === 4 && "4. ENREGISTREMENT SIHG"}
             </DialogTitle>
             <DialogDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2 px-11">
               {wizardStep === 1 && "Enregistrement des informations de base du dossier papier."}
               {wizardStep === 2 && "Vérification physique des pièces obligatoires."}
               {wizardStep === 3 && "Conversion des documents papier en fichiers PDF numériques."}
               {wizardStep === 4 && "Validation finale et entrée officielle dans le workflow."}
             </DialogDescription>
          </DialogHeader>

          <div className="py-2 min-h-[350px]">
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="space-y-3">
                   <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Nom de l'Entité (Propriétaire / Société)</Label>
                   <div className="relative">
                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                     <Input 
                       placeholder="Ex: SONAP Distribution SARL" 
                       className="rounded-[1.25rem] h-16 pl-12 border-slate-200 focus:border-slate-900 transition-all font-bold text-lg shadow-sm bg-slate-50/30" 
                       value={newEntiteNom}
                       onChange={(e) => setNewEntiteNom(e.target.value)}
                     />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                     <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Type d'Entité</Label>
                     <Select value={newEntiteType} onValueChange={setNewEntiteType}>
                        <SelectTrigger className="rounded-[1.25rem] h-16 border-slate-200 font-bold shadow-sm bg-slate-50/30"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl p-2">
                           <SelectItem value="entreprise" className="rounded-xl">Entreprise Pétrolière</SelectItem>
                           <SelectItem value="station" className="rounded-xl">Station-Service</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-3">
                     <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Nature de la Demande</Label>
                     <Select value={newTypeDemande} onValueChange={setNewTypeDemande}>
                        <SelectTrigger className="rounded-[1.25rem] h-16 border-slate-200 font-bold shadow-sm bg-slate-50/30"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl p-2">
                           <SelectItem value="agrement_entreprise" className="rounded-xl">Agrément d'Exploitation</SelectItem>
                           <SelectItem value="ouverture_station" className="rounded-xl">Ouverture de Station</SelectItem>
                           <SelectItem value="renouvellement_licence" className="rounded-xl">Renouvellement Licence</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                 </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 items-center mb-6">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-xs font-bold text-amber-900">
                    La numérisation n'est autorisée que si le dossier physique est complet. Vérifiez chaque pièce.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'rccm', label: 'Registre du Commerce (RCCM)' },
                    { key: 'nif', label: "Numéro d'Identification Fiscale (NIF)" },
                    { key: 'statuts', label: "Statuts de l'Entreprise" },
                    { key: 'photos', label: "Photos du Site" },
                    { key: 'quittance', label: "Quittance de Frais" },
                  ].map((item) => (
                    <div 
                      key={item.key} 
                      onClick={() => setChecklist(prev => ({ ...prev, [item.key]: ! (prev as any)[item.key] }))}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                        (checklist as any)[item.key] ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                          (checklist as any)[item.key] ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                        )}>
                          {(checklist as any)[item.key] ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                        </div>
                        <span className={cn("font-black uppercase text-[10px] tracking-widest", (checklist as any)[item.key] ? "text-emerald-700" : "text-slate-400")}>
                          {item.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'rccm_url', name: 'SCAN RCCM' },
                    { id: 'nif_url', name: 'SCAN NIF' },
                    { id: 'statuts_url', name: 'SCAN STATUTS' },
                    { id: 'autorisation_url', name: 'SCAN QUITTANCE' }
                  ].map((doc) => (
                    <div key={doc.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{doc.name}</Label>
                      <div className="relative group">
                        <Input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                          accept=".pdf"
                          onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               setUploadedFiles(prev => ({ ...prev, [doc.id]: 'PENDING_UPLOAD' }));
                               setTimeout(() => {
                                 setUploadedFiles(prev => ({ ...prev, [doc.id]: `https://storage.sihg.gn/temp/${doc.id}.pdf` }));
                                 toast.success(`${doc.name} prêt pour enregistrement.`);
                               }, 1000);
                             }
                          }}
                        />
                        <div className={cn(
                          "h-14 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all",
                          uploadedFiles[doc.id] ? "bg-blue-50 border-blue-200 text-blue-600" : "border-slate-100 bg-slate-50 group-hover:bg-white group-hover:border-slate-300"
                        )}>
                          {uploadedFiles[doc.id] ? (
                            <><FileCheck className="h-5 w-5" /> <span className="text-xs font-bold uppercase">PDF Chargé</span></>
                          ) : (
                            <><Plus className="h-5 w-5 opacity-50" /> <span className="text-xs font-bold uppercase text-slate-400">Scanner le document</span></>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500 py-12">
                <div className="h-32 w-32 rounded-[3.5rem] bg-slate-900 border-[8px] border-white flex items-center justify-center text-white shadow-2xl shadow-slate-900/40 rotate-12 hover:rotate-0 transition-transform duration-700">
                  <ShieldCheck className="h-14 w-14" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-3xl font-black text-slate-900 tracking-tighter">PRÊT POUR LE SIHG</h4>
                  <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed uppercase text-[10px] tracking-widest italic opacity-60">
                    "En cliquant sur confirmer, vous transformez ce dossier physique en dossier numérique officiel SONAP."
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-4 mt-8">
             {wizardStep > 1 && (
               <Button variant="ghost" className="rounded-2xl h-16 px-10 font-black uppercase text-[10px] tracking-widest border border-slate-100" onClick={() => setWizardStep(prev => prev - 1)}>Retour</Button>
             )}
             
             {wizardStep === 2 && !Object.values(checklist).every(v => v) ? (
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-16 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/20"
                  onClick={async () => {
                    const { error } = await supabase.from('dossiers').insert([{
                      numero_dossier: `SONAP-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,
                      entite_nom: newEntiteNom,
                      entite_type: newEntiteType,
                      type_demande: newTypeDemande,
                      statut: 'incomplet',
                      entite_id: '00000000-0000-0000-0000-000000000000',
                      observations: "Dossier physique incomplet lors du pré-contrôle."
                    }]);
                    if (error) toast.error(error.message);
                    else {
                      toast.error("Dossier INCOMPLET enregistré et bloqué.");
                      setIsNewDialogOpen(false);
                      setWizardStep(1);
                      fetchDossiers();
                    }
                  }}
                >
                  Dossier Incomplet (Enregistrer)
                </Button>
             ) : wizardStep < 4 ? (
               <Button 
                className="bg-slate-900 hover:bg-black text-white rounded-2xl h-16 px-12 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/30 transition-all active:scale-95" 
                onClick={() => {
                  if (wizardStep === 1 && !newEntiteNom) return toast.error("Entrez le nom de l'entité");
                  setWizardStep(prev => prev + 1);
                }}
               >
                 Prochaine Étape <ArrowRight className="ml-3 h-4 w-4" />
               </Button>
             ) : (
               <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-16 px-14 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-emerald-600/40 transition-all active:scale-95" 
                onClick={async () => {
                  const { error } = await supabase.from('dossiers').insert([{
                    numero_dossier: `SONAP-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,
                    entite_nom: newEntiteNom,
                    entite_type: newEntiteType,
                    type_demande: newTypeDemande,
                    statut: 'numerise',
                    entite_id: '00000000-0000-0000-0000-000000000000',
                    rccm_url: uploadedFiles.rccm_url,
                    nif_url: uploadedFiles.nif_url,
                    statuts_url: uploadedFiles.statuts_url,
                    autorisation_url: uploadedFiles.autorisation_url,
                    observations: "Dossier physique complet et numérisé avec succès."
                  }]);

                  if (error) toast.error(error.message);
                  else {
                    toast.success("Dossier NUMÉRISÉ enregistré dans SIHG !");
                    setIsNewDialogOpen(false);
                    setWizardStep(1);
                    setNewEntiteNom('');
                    fetchDossiers();
                  }
                }}
              >
                Confirmer l'Enregistrement
              </Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
