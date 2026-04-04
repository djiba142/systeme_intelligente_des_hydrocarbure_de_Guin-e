import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShieldCheck, FileText, Scale, CheckCircle2, AlertTriangle, 
  Search, Download, RefreshCw, Eye, MessageSquare, History,
  Lock, Gavel, ClipboardCheck, Info, Clock, ExternalLink,
  Plus, Building2, Loader2, FolderOpen, Ship, ShieldAlert, ChevronRight
} from 'lucide-react';

const HistoryIcon = History;
import { generateOfficialSONAPDocument } from '@/lib/officialDocuments';
import { ImportDossier } from '@/types/importation';
import { format } from 'date-fns';
import { notifyStationStatusUpdate } from '@/lib/notifications';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';

// types mock
interface LegalDossier {
  id: string;
  type: 'contrat' | 'licence' | 'agrement' | 'litige';
  entite: string;
  objet: string;
  dateSoumission: string;
  statut: 'en_analyse' | 'conforme' | 'non_conforme' | 'risque_eleve';
  priorite: 'haute' | 'normale' | 'basse';
  analyste?: string;
}

export default function DashboardJuridique() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDossierDialogOpen, setIsDossierDialogOpen] = useState(false);
  const [isProceduresDialogOpen, setIsProceduresDialogOpen] = useState(false);
  const [newDossier, setNewDossier] = useState({
    type: 'contrat',
    entite: '',
    objet: '',
    notes: ''
  });

  // Fetch dossiers from SIHG workflow awaiting legal analysis
  const { data: sihgDossiers = [], isLoading: isLoadingSIHG, refetch: refetchSIHG } = useQuery({
    queryKey: ['sihg-dossiers-pending-legal'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dossiers_entreprise')
        .select(`
          id, numero_dossier, entite_nom, type_demande, statut, created_at,
          entreprises(nom, sigle)
        `)
        .in('statut', ['valide_admin', 'en_analyse_jur'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch stations awaiting legal validation (legacy/specific)
  const { data: stations = [], isLoading, refetch } = useQuery({
    queryKey: ['stations-pending-legal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stations')
        .select(`
          id, nom, code, region, ville, statut, created_at,
          entreprise:entreprises(nom, sigle)
        `)
        .eq('statut', 'attente_djc')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch Import Dossiers waiting for legal validation
  const { data: importDossiers = [], refetch: refetchImports } = useQuery({
    queryKey: ['imports-pending-legal'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('import_dossiers')
        .select('*')
        .eq('statut', 'validation_juridique');

      if (error) return [];
      return data || [];
    }
  });
  const handleSIHGDossierAction = async (dossierId: string, action: 'analyse' | 'valider' | 'rejeter') => {
    let nextStatut: string = '';
    if (action === 'analyse') nextStatut = 'en_analyse_jur';
    else if (action === 'valider') nextStatut = 'valide_jur';
    else if (action === 'rejeter') nextStatut = 'rejete';

    try {
        const { error } = await (supabase as any)
            .from('dossiers_entreprise')
            .update({ statut: nextStatut })
            .eq('id', dossierId);

        if (error) throw error;

        toast({ title: "Succès", description: `Dossier mis à jour : ${nextStatut}` });
        refetchSIHG();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: "Échec de la mise à jour." });
    }
  };

  const handleApproveImport = async (dossierId: string) => {
    try {
      toast({ title: "Validation Juridique", description: "Vérification des clauses contractuelles..." });
      // Real DB update would be:
      // await supabase.from('import_dossiers').update({ statut: 'attente_paiement' }).eq('id', dossierId);
      toast({ title: "Dossier Validé", description: "Le dossier est prêt pour le transport." });
      refetchImports();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de la validation." });
    }
  };

  const handleCertify = async (station: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stations')
        .update({ statut: 'attente_dsi' }) // Next stage: Activation IT
        .eq('id', station.id);

      if (error) throw error;

      // Générer le certificat officiel avec QR Code
      await generateOfficialSONAPDocument({
        type: 'conformite',
        numero: `CERT-${station.code}-${new Date().getFullYear()}`,
        entite: station.nom,
        adresse: `${station.ville}, ${station.region}`,
        details: {
          'Propriétaire': station.entreprise?.nom || station.entreprise?.sigle || 'N/A',
          'Région': station.region,
          'Date de Certification': format(new Date(), 'dd/MM/yyyy HH:mm'),
          'Statut SIHG': 'Validé DJ/C'
        },
        signatureRole: 'Directeur Juridique & Conformité'
      });

      await notifyStationStatusUpdate(station, 'attente_dsi');

      toast({
        title: "Dossier certifié",
        description: `Le certificat pour ${station.nom} a été généré et envoyé à la DSI.`,
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de certification",
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCertifyAgrement = async (name: string) => {
    try {
      await generateOfficialSONAPDocument({
        type: 'autorisation',
        numero: `AGR-${name.replace(/\s+/g, '-').toUpperCase()}-${new Date().getFullYear()}`,
        entite: name,
        details: {
          'Type d\'Agrément': 'Opérateur Station-Service',
          'Date d\'Émission': format(new Date(), 'dd/MM/yyyy'),
          'Validité': '24 Mois à compter de la date d\'activation IT',
          'Conformité': 'Validé selon Décret 2024-SONAP'
        },
        signatureRole: 'Directeur Juridique & Conformité'
      });
      toast({
        title: "Certification d'Agrément",
        description: `L'agrément pour ${name} a été certifié et le document a été généré.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur Certification",
        description: error.message
      });
    }
  };

  const filteredStations = useMemo(() => {
    return stations.filter(s => 
      s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.entreprise as any)?.nom?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stations, searchQuery]);

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string, color: string }> = {
      attente_dsa: { label: 'TECH DSA', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      attente_dla: { label: 'ADMIN DLA', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      attente_djc: { label: 'LEGAL DJC', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      attente_dsi: { label: 'ACTIVATION IT', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      ouverte: { label: 'ACTIF / OUVERT', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      fermee: { label: 'FERMÉ', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      suspendu_legal: { label: 'SUSPENDU', color: 'bg-red-100 text-red-700 border-red-200' },
    };
    const c = configs[statut];
    return <Badge className={cn("text-[10px] font-black uppercase tracking-widest", c.color)} variant="outline">{c.label}</Badge>;
  };

  return (
    <DashboardLayout
      title="Direction Juridique & Conformité"
      subtitle="Garant légal, supervision de la conformité et gestion des risques réglementaires"
    >
      {/* Header Premium (Similaire aux autres dashboards stratégiques) */}
      <div className="flex items-center justify-between mb-8 p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Département Certification Légale</span>
          </div>
          <h2 className="text-4xl font-black font-display tracking-tighter uppercase mb-2">Pôle Conformité</h2>
          <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed italic opacity-80">
            Filtrage réglementaire obligatoire pour toute action administrative, financière ou stratégique de la SONAP.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-inner">
          <img src={logo} alt="SIHG" className="h-12 w-auto brightness-0 invert opacity-90" />
          <div className="h-10 w-[1px] bg-white/10"></div>
          <img src={sonapLogo} alt="SONAP" className="h-12 w-auto brightness-0 invert opacity-90" />
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
          <Gavel className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-indigo-900 uppercase tracking-widest italic">Rôle de Filtrage Légal Obligatoire</p>
          <p className="text-[10px] text-indigo-700 font-medium">Conformément à l'organigramme national, aucun dossier administratif ou contrat ne peut être validé sans l'aval préalable de la DJ/C.</p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white border-indigo-200 text-indigo-700 font-black text-[10px] uppercase tracking-widest gap-2"
          onClick={() => setIsProceduresDialogOpen(true)}
        >
          <Info size={12} /> Procédures de Conformité
        </Button>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Workflow', icon: FolderOpen, path: '/dossiers', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
          { label: 'Contrats', icon: FileText, path: '/juridique/contrats', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
          { label: 'Conformité', icon: ShieldCheck, path: '/juridique/conformite', color: 'bg-blue-50 text-blue-600 border-blue-100' },
          { label: 'Litiges', icon: Gavel, path: '/juridique/litiges', color: 'bg-red-50 text-red-600 border-red-100' },
          { label: 'Archives', icon: HistoryIcon, path: '/juridique/archives', color: 'bg-slate-50 text-slate-600 border-slate-100' },
        ].map((mod, i) => (
          <Card 
            key={i} 
            className={cn("border cursor-pointer hover:shadow-lg transition-all rounded-[1.5rem] overflow-hidden group", mod.color)}
            onClick={() => navigate(mod.path)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
               <div className="h-10 w-10 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
                  <mod.icon className="h-5 w-5" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest">{mod.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Dossiers en Analyse" value={14} subtitle="Validation requise" icon={ClipboardCheck} variant="primary" />
        <StatCard title="Alertes Non-Conformité" value={3} subtitle="Risques identifiés" icon={AlertTriangle} />
        <StatCard title="Contrats Certifiés" value={87} subtitle="Ce mois-ci" icon={ShieldCheck} />
        <StatCard title="Temps de Traitement" value="4.2j" subtitle="Moyenne de validation" icon={Clock} />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analyse" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <TabsTrigger value="analyse" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest">
              <Scale className="h-3.5 w-3.5" /> Analyse Juridique
            </TabsTrigger>
            <TabsTrigger value="conformite" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Conformité DSA/DLA
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest" onClick={() => navigate('/dossiers')}>
              <FolderOpen className="h-3.5 w-3.5" /> Workflow Dossiers
            </TabsTrigger>
            <TabsTrigger value="consultation" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest">
              <Eye className="h-3.5 w-3.5" /> Consultation & Conseil
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher un dossier..." 
                className="pl-9 h-11 rounded-xl bg-white border-slate-200 w-64 text-xs font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-200 bg-white" onClick={() => { refetch(); refetchSIHG(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dossiers Table */}
        <TabsContent value="analyse" className="space-y-4">
          <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Registre d'Analyse Juridique</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-500 italic mt-1 uppercase tracking-widest opacity-60">
                    S'assurer que chaque acte respecte la Loi Pétrolière et les décrets nationaux
                  </CardDescription>
                </div>
                {role !== 'super_admin' && (
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl px-6 h-10 shadow-lg shadow-indigo-600/20"
                    onClick={() => setIsDossierDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Nouveau Dossier DJ
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="text-left py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Réf Dossier / Date</th>
                      <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Entité / Objet</th>
                      <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut Juridique</th>
                      <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Analyseur</th>
                      <th className="text-right py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading || isLoadingSIHG ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
                          <p className="text-xs text-slate-500 font-bold mt-4 uppercase">Chargement des dossiers...</p>
                        </td>
                      </tr>
                    ) : filteredStations.length === 0 && sihgDossiers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Scale className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                          <p className="text-sm font-bold text-slate-400 uppercase">Aucune analyse juridique en attente</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Dossiers SIHG en premier */}
                        {sihgDossiers.map((d: any) => (
                           <tr key={d.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/dossiers/${d.id}`)}>
                            <td className="py-6 px-8">
                              <div className="text-xs font-black text-slate-900 mb-1">{d.numero_dossier}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{new Date(d.created_at).toLocaleDateString('fr-FR')}</div>
                            </td>
                            <td className="py-6 px-6">
                              <div className="text-xs font-black text-indigo-600 uppercase mb-1">{d.entreprises?.sigle || d.entreprises?.nom || 'Dossier'}</div>
                              <div className="text-xs font-bold text-slate-600">{d.type_demande.replace(/_/g, ' ')}</div>
                            </td>
                            <td className="py-6 px-6">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-widest border-none",
                                d.statut === 'valide_admin' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                              )}>
                                {d.statut === 'valide_admin' ? 'Prêt pour DJ' : 'Analyse DJ'}
                              </Badge>
                            </td>
                            <td className="py-6 px-6 italic text-[10px] text-slate-400">SIHG Workflow</td>
                             <td className="py-6 px-8 text-right">
                               <div className="flex items-center justify-end gap-3">
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {d.statut === 'valide_admin' && (
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Prendre en charge" onClick={(e) => { e.stopPropagation(); handleSIHGDossierAction(d.id, 'analyse'); }}>
                                              <Clock className="h-3.5 w-3.5" />
                                          </Button>
                                      )}
                                      {d.statut === 'en_analyse_jur' && (
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Valider juridiquement" onClick={(e) => { e.stopPropagation(); handleSIHGDossierAction(d.id, 'valider'); }}>
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                          </Button>
                                      )}
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Rejeter" onClick={(e) => { e.stopPropagation(); handleSIHGDossierAction(d.id, 'rejeter'); }}>
                                          <ShieldAlert className="h-3.5 w-3.5" />
                                      </Button>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600"><ChevronRight className="h-4 w-4" /></Button>
                               </div>
                             </td>
                           </tr>
                        ))}

                        {/* Stations Legacy */}
                        {filteredStations.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-6 px-8">
                              <div className="text-xs font-black text-slate-900 mb-1">{s.code}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{new Date(s.created_at).toLocaleDateString('fr-FR')}</div>
                            </td>
                            <td className="py-6 px-6">
                              <div className="text-xs font-black text-indigo-600 uppercase mb-1">{(s.entreprise as any)?.sigle || (s.entreprise as any)?.nom}</div>
                              <div className="text-xs font-bold text-slate-600">{s.nom} ({s.ville})</div>
                            </td>
                            <td className="py-6 px-6">
                              {getStatutBadge(s.statut)}
                            </td>
                            <td className="py-6 px-6">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-black text-indigo-400">
                                  DP
                                </div>
                                <span className="text-xs font-bold text-slate-600">Dossier Public</span>
                              </div>
                            </td>
                            <td className="py-6 px-8 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-indigo-600"
                                  onClick={() => navigate('/dossiers')}
                                  title="Voir Documents PDF"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                  {role !== 'super_admin' && (
                                    <Button 
                                      onClick={() => handleCertify(s)}
                                      disabled={loading}
                                      className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/10"
                                    >
                                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Certifier'}
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Conformité Mock */}
        <TabsContent value="conformite">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="border-slate-200 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 px-8 py-6">
                  <CardTitle className="text-lg font-black uppercase text-emerald-900">Validation des Agréments DSA</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <p className="text-xs text-slate-500 font-medium italic">Vérification de la chaîne de conformité pour les ordres de ravitaillement et nouvelles licences de station.</p>
                   <div className="space-y-4">
                     {[1,2].map(i => (
                       <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase">Station {i === 1 ? 'Matoto' : 'Dixinn'} (Nouvelle Opération)</p>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Soumis par : Direction Service Aval</p>
                            </div>
                          </div>
                          {role !== 'super_admin' && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg h-8 px-4"
                              onClick={() => handleCertifyAgrement(i === 1 ? 'Station Matoto' : 'Station Dixinn')}
                            >
                              Certifier
                            </Button>
                          )}
                       </div>
                     ))}
                   </div>
                </CardContent>
             </Card>

             <Card className="border-slate-200 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-purple-50/50 border-b border-purple-100 px-8 py-6">
                  <CardTitle className="text-lg font-black uppercase text-purple-900">Validation Importations (Appro)</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <p className="text-xs text-slate-500 font-medium italic">Analyse de conformité pour les cargaisons internationales et contrats fournisseurs.</p>
                   <div className="space-y-4">
                     {importDossiers.length > 0 ? (
                       importDossiers.map((d: any) => (
                         <div key={d.id} className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white rounded-xl border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
                                <Ship className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900 uppercase">{d.numero_dossier || 'Dossier Import'}</p>
                                 <p className="text-[10px] text-purple-600 font-bold uppercase tracking-tighter">{d.carburant} — {d.navire_nom}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest border-purple-200 text-purple-700 hover:bg-purple-100" onClick={() => handleApproveImport(d.id)}>
                                VALIDER LÉGAL
                              </Button>
                            </div>
                         </div>
                       ))
                     ) : (
                       <div className="p-4 rounded-2xl bg-slate-50 border border-dotted border-slate-300 flex items-center justify-center gap-3">
                          <ClipboardCheck className="h-4 w-4 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun dossier en attente</span>
                       </div>
                     )}
                   </div>
                </CardContent>
             </Card>
           </div>
        </TabsContent>
        
        <TabsContent value="consultation">
          <Card className="border-slate-200 shadow-lg rounded-3xl bg-white p-12 text-center">
             <MessageSquare className="h-16 w-16 mx-auto text-indigo-200 mb-6" />
             <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Service de Conseil Juridique</h3>
             <p className="text-sm text-slate-500 max-w-md mx-auto italic font-medium">
               Ce module permet aux autres directions de solliciter un avis juridique formel sur des dossiers complexes.
             </p>
             <Button className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20" onClick={() => toast({ title: "Service Indisponible", description: "Veuillez utiliser le module de dossiers pour toute demande formelle." })}>
                Solliciter un Avis
             </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nouveau Dossier */}
      <Dialog open={isDossierDialogOpen} onOpenChange={setIsDossierDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Plus className="text-indigo-600" /> Créer un nouveau dossier juridique
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 italic">
              Enregistrement d'un nouvel acte, contrat ou dossier de conformité dans le SIHG.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Dossier</Label>
                <Select value={newDossier.type} onValueChange={(v) => setNewDossier({...newDossier, type: v})}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrat">Contrat Commercial</SelectItem>
                    <SelectItem value="licence">Licence d'Exploitation</SelectItem>
                    <SelectItem value="agrement">Agrément Professionnel</SelectItem>
                    <SelectItem value="litige">Contentieux / Litige</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entité Concernée</Label>
                <Input 
                  placeholder="Ex: TotalEnergies Guinea" 
                  className="rounded-xl h-10 border-slate-200"
                  value={newDossier.entite}
                  onChange={(e) => setNewDossier({...newDossier, entite: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objet du Dossier</Label>
              <Input 
                placeholder="Ex: Renouvellement Licence Importation 2026" 
                className="rounded-xl h-10 border-slate-200"
                value={newDossier.objet}
                onChange={(e) => setNewDossier({...newDossier, objet: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes & Contexte Juridique</Label>
              <Textarea 
                placeholder="Détails supplémentaires pour l'équipe d'analyse..." 
                className="rounded-2xl border-slate-200 min-h-[100px]"
                value={newDossier.notes}
                onChange={(e) => setNewDossier({...newDossier, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDossierDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-10"
              onClick={() => {
                if (!newDossier.entite || !newDossier.objet) {
                  toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir l'entité et l'objet." });
                  return;
                }
                toast({ title: "Dossier Enregistré", description: "Le dossier a été créé avec succès." });
                setIsDossierDialogOpen(false);
                setNewDossier({ type: 'contrat', entite: '', objet: '', notes: '' });
              }}
            >
              Enregistrer le Dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Procédures */}
      <Dialog open={isProceduresDialogOpen} onOpenChange={setIsProceduresDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-8 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
             <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
               <Scale className="h-6 w-6" />
             </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Procédures & Standards de Conformité</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 italic">
              Guide officiel de la Direction Juridique pour le filtrage SIHG.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
               <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-500" /> Règle de Filtrage #001 : Agrément</h4>
               <p className="text-xs text-slate-600 leading-relaxed">
                 Aucune entreprise ne peut obtenir d'autorisation d'opérer sans un Agrément d'Exploitation valide, certifié par la DJ/C. Le système SIHG bloque automatiquement toute activité en cas d'expiration.
               </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
               <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-500" /> Règle de Filtrage #002 : Stations</h4>
               <p className="text-xs text-slate-600 leading-relaxed">
                 Toute nouvelle station ou station rachetée passe par un statut d'<strong>Attente de Validation</strong>. La DJ/C vérifie les titres de propriété et les baux emphytéotiques avant libération du code station.
               </p>
            </div>
            <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
               <div className="flex items-center gap-2 text-blue-700">
                  <Info size={16} />
                  <h4 className="text-xs font-black uppercase">Consigne de Sécurité</h4>
               </div>
               <p className="text-[11px] text-blue-800/80 italic font-medium">
                 Toute anomalie détectée doit être immédiatement signalée au Super Admin pour activation du Centre National de Sécurité.
               </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsProceduresDialogOpen(false)} className="rounded-xl w-full bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest h-12">Fermer le Guide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
