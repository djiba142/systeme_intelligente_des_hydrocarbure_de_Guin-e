import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Plus, Search, Filter, FileText, CheckCircle2, 
  XCircle, Clock, MoreHorizontal, Download, Eye, 
  Building2, ArrowRight, ShieldCheck, AlertCircle,
  FileCheck, Shield, Activity, UserCheck, Archive
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
  const [wizardStep, setWizardStep] = useState(1); // 1: Recu, 2: Pre-controle, 3: Numerisation
  const [checklist, setChecklist] = useState({
    rccm: false,
    nif: false,
    statuts: false,
    photos: false,
    quittance: false
  });

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
      const updateData: any = { statut: newStatus, updated_at: new Date().toISOString() };
      
      // Assign validator based on role
      if (role?.includes('aval')) updateData.valide_par_dsa = user?.id;
      if (role?.includes('administratif')) updateData.valide_par_da = user?.id;
      if (role?.includes('juridique')) updateData.valide_par_djc = user?.id;
      
      // Final validation by DG or equivalent
      if (['directeur_general', 'directeur_adjoint', 'admin_etat', 'super_admin'].includes(role || '')) {
        updateData.valide_par_dg = user?.id;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus].label}`);
      fetchDossiers();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
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
        {/* Banner Summary */}
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

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Référence, entreprise ou station..." 
              className="pl-10 h-11 rounded-xl bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl bg-white gap-2 font-bold border-slate-200" onClick={fetchDossiers}>
              <Activity className={cn("h-4 w-4", loading && "animate-spin")} /> Rafraîchir
            </Button>
            {['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
              <Button 
                onClick={() => setIsNewDialogOpen(true)}
                className="h-11 rounded-xl bg-slate-900 hover:bg-black text-white gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" /> Enregistrer un Dossier
              </Button>
            )}
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
                                
                                {d.statut === 'recu' && ['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-blue-600" onClick={() => { setSelectedDossier(d); setIsDossierDetailOpen(true); }}>
                                    <FileText className="h-4 w-4" /> Procéder à la Numérisation (Scan)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'numerise' && ['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-amber-600" onClick={() => handleUpdateStatus(d.id, 'analyse_technique')}>
                                    <Activity className="h-4 w-4" /> Transmettre à la DSA (Technique)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_technique' && ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-600" onClick={() => handleUpdateStatus(d.id, 'analyse_administrative')}>
                                    <FileCheck className="h-4 w-4" /> Valider & Transmettre à la DA
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_administrative' && ['directeur_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-purple-600" onClick={() => handleUpdateStatus(d.id, 'analyse_juridique')}>
                                    <Shield className="h-4 w-4" /> Valider & Transmettre à la DJ/C
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_juridique' && ['directeur_juridique', 'juriste', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-600" onClick={() => handleUpdateStatus(d.id, 'approuve')}>
                                    <CheckCircle2 className="h-4 w-4" /> Proposer pour Approbation Finale (DG)
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
                        { label: 'Réception SONAP', key: 'recu', icon: FolderOpen, color: 'text-slate-400' },
                        { label: 'Analyse DSA', key: 'valide_par_dsa', icon: Activity, color: 'text-indigo-400' },
                        { label: 'Analyse Administrative', key: 'valide_par_da', icon: FileCheck, color: 'text-amber-400' },
                        { label: 'Analyse Juridique/Legal', key: 'valide_par_djc', icon: Shield, color: 'text-purple-400' },
                        { label: 'Décision FINALE (DG)', key: 'valide_par_dg', icon: CheckCircle2, color: 'text-emerald-400' }
                      ].map((step, idx) => {
                        const isDone = step.key === 'recu' ? true : !!(selectedDossier as any)[step.key];
                        return (
                          <div key={idx} className="flex items-start gap-4 relative z-10">
                            <div className={cn(
                              "h-3 w-3 rounded-full mt-1 border-2 border-slate-900 ring-2 ring-offset-2 ring-offset-slate-900 transition-all duration-500",
                              isDone ? "bg-white ring-white/50" : "bg-slate-700 ring-transparent"
                            )} />
                            <div className="flex flex-col">
                              <span className={cn("text-[10px] font-black uppercase tracking-widest", isDone ? "text-white" : "text-slate-600")}>
                                {step.label}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium">
                                {isDone ? "Action validée et tracée" : "En attente de traitement"}
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
                  <Button variant="outline" className="rounded-xl px-8 font-bold h-12" onClick={() => setIsDossierDetailOpen(false)}>Fermer</Button>
                  
                  {/* Action for Administrative Agent during Scan Phase */}
                  {selectedDossier.statut === 'recu' && (selectedDossier.rccm_url || selectedDossier.nif_url || selectedDossier.statuts_url) && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20"
                      onClick={() => handleUpdateStatus(selectedDossier.id, 'numerise')}
                    >
                      <FileCheck className="mr-2 h-4 w-4" /> Terminer la Numérisation
                    </Button>
                  )}

                  {/* Decision Panel for Directions */}
                  {((selectedDossier.statut === 'numerise' && role?.includes('aval')) ||
                    (selectedDossier.statut === 'analyse_technique' && role?.includes('administratif')) ||
                    (selectedDossier.statut === 'analyse_administrative' && role?.includes('juridique')) ||
                    (selectedDossier.statut === 'analyse_juridique' && ['directeur_general', 'super_admin'].includes(role || ''))) && (
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="destructive" 
                        className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest"
                        onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}
                      >
                        Rejeter
                      </Button>
                      <Button 
                        className="flex-[2] bg-slate-900 hover:bg-black text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest shadow-xl"
                        onClick={() => {
                          const nextStatus: Record<string, DossierStatus> = {
                            'numerise': 'analyse_technique',
                            'analyse_technique': 'analyse_administrative',
                            'analyse_administrative': 'analyse_juridique',
                            'analyse_juridique': 'approuve'
                          };
                          handleUpdateStatus(selectedDossier.id, nextStatus[selectedDossier.statut] || 'approuve');
                        }}
                      >
                        Valider & Transférer
                      </Button>
                    </div>
                  )}
                  
                  {/* Final Approval Action */}
                  {selectedDossier.statut === 'approuve' && (
                     <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20"
                      onClick={() => {
                        toast.success("Document officiel généré en PDF !");
                        setTimeout(() => {
                           window.open('https://bjcnvbrcyezswdrefzgh.supabase.co/storage/v1/object/public/templates/exemplaire_agrement_sihg.pdf', '_blank');
                        }, 1000);
                      }}
                     >
                       <ShieldCheck className="mr-2 h-4 w-4" /> Télécharger l'Agrément / Licence
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
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={cn(
                  "h-2 flex-1 rounded-full transition-all duration-500",
                  wizardStep >= step ? "bg-slate-900" : "bg-slate-100"
                )} 
              />
            ))}
          </div>

          <DialogHeader>
             <DialogTitle className="text-3xl font-black tracking-tighter">
               {wizardStep === 1 && "1. RÉCEPTION PHYSIQUE"}
               {wizardStep === 2 && "2. PRÉ-CONTRÔLE DOCS"}
               {wizardStep === 3 && "3. FINALISATION"}
             </DialogTitle>
             <DialogDescription className="font-medium">
               {wizardStep === 1 && "Enregistrement des informations de base du dossier papier."}
               {wizardStep === 2 && "Vérification de la présence des pièces obligatoires."}
               {wizardStep === 3 && "Attribution du numéro de dossier et confirmation."}
             </DialogDescription>
          </DialogHeader>

          <div className="py-6 min-h-[300px]">
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="space-y-3">
                   <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nom de l'Entité (Entreprise / Station)</Label>
                   <div className="relative">
                     <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                     <Input 
                       placeholder="Ex: SONAP Distribution SARL" 
                       className="rounded-2xl h-14 pl-10 border-slate-200 focus:border-slate-900 transition-all font-bold text-lg shadow-sm" 
                       value={newEntiteNom}
                       onChange={(e) => setNewEntiteNom(e.target.value)}
                     />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                     <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Type d'Entité</Label>
                     <Select value={newEntiteType} onValueChange={setNewEntiteType}>
                        <SelectTrigger className="rounded-2xl h-14 border-slate-200 font-bold shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl p-2">
                           <SelectItem value="entreprise" className="rounded-xl">Entreprise</SelectItem>
                           <SelectItem value="station" className="rounded-xl">Station-Service</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-3">
                     <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nature de la Demande</Label>
                     <Select value={newTypeDemande} onValueChange={setNewTypeDemande}>
                        <SelectTrigger className="rounded-2xl h-14 border-slate-200 font-bold shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl p-2">
                           <SelectItem value="agrement_entreprise" className="rounded-xl">Demande d'Agrément</SelectItem>
                           <SelectItem value="ouverture_station" className="rounded-xl">Ouverture Station</SelectItem>
                           <SelectItem value="renouvellement_licence" className="rounded-xl">Licence d'Exploitation</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                 </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm font-bold text-slate-500 mb-4 bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  Veuillez vérifier physiquement le dossier papier et cocher les pièces présentes.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(checklist).map(([key, value]) => (
                    <div 
                      key={key} 
                      onClick={() => setChecklist(prev => ({ ...prev, [key]: !value }))}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                        value ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
                          value ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                        )}>
                          {value ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                        </div>
                        <span className={cn("font-bold uppercase text-[10px] tracking-widest", value ? "text-emerald-700" : "text-slate-500")}>
                          {key === 'rccm' && "Registre du Commerce (RCCM)"}
                          {key === 'nif' && "Numéro d'Identification Fiscale (NIF)"}
                          {key === 'statuts' && "Statuts de l'Entreprise"}
                          {key === 'photos' && "Photos du Site (Si Station)"}
                          {key === 'quittance' && "Quittance de Frais de Dossier"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500 py-10">
                <div className="h-24 w-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter">PRÊT À L'ENREGISTREMENT</h4>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2">
                    Le dossier physique sera enregistré avec le statut 
                    <Badge className="mx-1 bg-slate-100 text-slate-900 border-none">
                      {Object.values(checklist).every(v => v) ? 'REÇU' : 'INCOMPLET'}
                    </Badge>
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
             {wizardStep > 1 && (
               <Button variant="ghost" className="rounded-2xl h-14 px-8 font-bold" onClick={() => setWizardStep(prev => prev - 1)}>Retour</Button>
             )}
             {wizardStep < 3 ? (
               <Button 
                className="bg-slate-900 text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20" 
                onClick={() => {
                  if (wizardStep === 1 && !newEntiteNom) return toast.error("Entrez le nom de l'entité");
                  setWizardStep(prev => prev + 1);
                }}
               >
                 Continuer <ArrowRight className="ml-2 h-4 w-4" />
               </Button>
             ) : (
               <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95" 
                onClick={async () => {
                  const isComplete = Object.values(checklist).every(v => v);
                  const { error } = await supabase.from('dossiers').insert([{
                    numero_dossier: `SONAP-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,
                    entite_nom: newEntiteNom,
                    entite_type: newEntiteType,
                    type_demande: newTypeDemande,
                    statut: isComplete ? 'recu' : 'incomplet',
                    entite_id: '00000000-0000-0000-0000-000000000000',
                    observations: isComplete ? "Dossier physique complet réceptionné." : "Dossier incomplet. Pièces manquantes identifiées au pré-contrôle."
                  }]);

                  if (error) toast.error(error.message);
                  else {
                    toast.success(isComplete ? "Dossier RÉÇU enregistré !" : "Dossier INCOMPLET enregistré !");
                    setIsNewDialogOpen(false);
                    setWizardStep(1);
                    setNewEntiteNom('');
                    fetchDossiers();
                  }
                }}
              >
                Confirmer la Réception
              </Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
