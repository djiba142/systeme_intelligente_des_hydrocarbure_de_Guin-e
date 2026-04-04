import React, { useState } from 'react';
import { 
  ShieldCheck, Search, Filter, CheckCircle2, XCircle, 
  AlertTriangle, Building2, ClipboardCheck, Info,
  CheckSquare, Activity, ShieldAlert, History, Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConformiteEntreprise {
  id: string;
  nom: string;
  sigle: string;
  statutGlobal: 'conforme' | 'non_conforme' | 'attention';
  derniereVerif: string;
  documents: {
    licence: boolean;
    assurance: boolean;
    agrement: boolean;
    environnement: boolean;
  };
}

const mockConformite: ConformiteEntreprise[] = [
  { id: '1', nom: 'TotalEnergies Marketing Guinea', sigle: 'TOTAL', statutGlobal: 'conforme', derniereVerif: '2026-03-01', documents: { licence: true, assurance: true, agrement: true, environnement: true } },
  { id: '2', nom: 'Vivo Energy Guinée', sigle: 'SHELL', statutGlobal: 'attention', derniereVerif: '2026-02-15', documents: { licence: true, assurance: true, agrement: false, environnement: true } },
  { id: '3', nom: 'Kamsar Petroleum', sigle: 'KP', statutGlobal: 'non_conforme', derniereVerif: '2026-03-10', documents: { licence: true, assurance: false, agrement: false, environnement: false } },
  { id: '4', nom: 'TMI Logistics SARL', sigle: 'TMI', statutGlobal: 'conforme', derniereVerif: '2026-03-05', documents: { licence: true, assurance: true, agrement: true, environnement: true } },
];

export default function ConformitePage() {
  const [search, setSearch] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'conforme': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Totalement Conforme</Badge>;
      case 'attention': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Documents Manquants</Badge>;
      case 'non_conforme': return <Badge className="bg-red-100 text-red-700 border-red-200">Non Conforme</Badge>;
      default: return <Badge>{statut}</Badge>;
    }
  };

  const getDocIcon = (status: boolean) => {
    return status 
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      : <XCircle className="h-4 w-4 text-red-400" />;
  };

  const handleAuditGlobal = () => {
    setIsAuditing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Analyse croisée des bases de données SIHG...',
        success: () => {
          setIsAuditing(false);
          return 'Audit de conformité national terminé. 3 anomalies détectées.';
        },
        error: 'Échec de l\'audit.',
      }
    );
  };

  const handleAuditReport = (company: string) => {
    toast.info(`Génération du rapport d'audit détaillé pour ${company}...`, {
      description: "Le document sera disponible dans vos archives juridiques sous peu.",
      duration: 3000,
    });
  };

  return (
    <DashboardLayout title="Conformité & Contrôle" subtitle="Surveillance réglementaire et respect des procédures SONAP">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-indigo-500/20">
          <div className="absolute top-0 right-0 w-[40rem] h-full bg-indigo-500/5 -skew-x-12 translate-x-20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Audit de Conformité National</span>
              </div>
              <h2 className="text-5xl font-black font-display tracking-tight uppercase leading-none">Vigilance Sectorielle</h2>
              <p className="text-indigo-200 text-sm max-w-lg font-medium opacity-80 leading-relaxed italic">
                Contrôle automatique de l'éligibilité des entreprises aux opérations d'importation, de distribution et de stockage.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-inner">
               <div className="text-center px-4">
                  <p className="text-2xl font-black text-white">12</p>
                  <p className="text-[9px] font-black uppercase text-indigo-300 opacity-60">Audits / jour</p>
               </div>
               <div className="h-10 w-[1px] bg-white/10" />
               <div className="text-center px-4">
                  <p className="text-2xl font-black text-amber-400">03</p>
                  <p className="text-[9px] font-black uppercase text-amber-300/60 font-black">Anomalies</p>
               </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-white shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-border/50 p-8">
                 <div className="flex items-center justify-between">
                    <div>
                       <CardTitle className="text-xl font-black uppercase tracking-tight">Index de Conformité Entreprises</CardTitle>
                       <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vérification des agréments et licences</CardDescription>
                    </div>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <Input 
                        placeholder="Rechercher une entité..." 
                        className="pl-9 rounded-xl border-slate-200 h-10 w-64 text-xs font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                       />
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead>
                         <tr className="bg-slate-50 px-8 border-b border-border/30">
                            <th className="text-left py-4 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Compagnie</th>
                            <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Matrice Documentaire</th>
                            <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut</th>
                            <th className="text-right py-4 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Audit</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {mockConformite.filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) || e.sigle.toLowerCase().includes(search.toLowerCase())).map((e) => (
                           <tr key={e.id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group">
                             <td className="py-6 px-8">
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all">
                                      {e.sigle}
                                   </div>
                                   <div>
                                      <p className="text-[13px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{e.nom}</p>
                                      <p className="text-[10px] text-slate-400 font-bold italic">Région : Conakry</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6 px-6">
                                <div className="flex items-center gap-4">
                                   <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">Licence</span>
                                      {getDocIcon(e.documents.licence)}
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">Assur.</span>
                                      {getDocIcon(e.documents.assurance)}
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">Agrém.</span>
                                      {getDocIcon(e.documents.agrement)}
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">Env.</span>
                                      {getDocIcon(e.documents.environnement)}
                                   </div>
                                </div>
                             </td>
                             <td className="py-6 px-6">
                                {getStatutBadge(e.statutGlobal)}
                             </td>
                             <td className="py-6 px-8 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 px-4 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md text-[10px] font-black uppercase tracking-widest text-indigo-600"
                                  onClick={() => handleAuditReport(e.sigle)}
                                >
                                   Rapport Audit
                                </Button>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
             <Card className="border-border bg-white shadow-xl shadow-slate-200/50 rounded-[2.5rem] p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                   <ShieldAlert className="h-4 w-4 text-amber-500" /> Alertes de Conformité
                </h3>
                <div className="space-y-5">
                   {[
                     { title: "Kamsar Petroleum", issue: "Assurance Expirée", level: "high" },
                     { title: "Vivo Energy", issue: "Agrément non renouvelé", level: "medium" },
                   ].map((a, i) => (
                     <div key={i} className="flex gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 relative group cursor-pointer hover:bg-white hover:border-amber-200 transition-all">
                        <div className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                          a.level === 'high' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                        )}>
                           <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-900 uppercase">{a.title}</p>
                           <p className="text-[10px] text-slate-500 font-bold mt-1 italic leading-tight">{a.issue}</p>
                           <div className="flex items-center gap-4 mt-3">
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest underline decoration-2 underline-offset-4" onClick={() => toast.success("Anomalie transmise au département technique")}>Signaler Anomalie</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest" onClick={() => toast.info("Alerte ignorée temporairement")}>Ignorer</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
                <Button 
                  disabled={isAuditing}
                  onClick={handleAuditGlobal}
                  className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest mt-6"
                >
                   {isAuditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                   Lancer Audit Global
                </Button>
             </Card>

             <Card className="border-border bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 rounded-[2.5rem] p-8 overflow-hidden relative">
                <Activity className="absolute bottom-[-20px] right-[-20px] h-32 w-32 text-white/5 rotate-12" />
                <div className="relative z-10 space-y-6">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 italic">Score de Résilience</p>
                   <div>
                      <h4 className="text-5xl font-black tracking-tighter">82%</h4>
                      <p className="text-xs font-bold text-indigo-100/60 mt-2 uppercase tracking-tight">Capacité d'audit temps réel</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                         <p className="text-lg font-black">15</p>
                         <p className="text-[8px] font-black uppercase text-indigo-200/50">Stations Ouvertes</p>
                      </div>
                      <div>
                         <p className="text-lg font-black text-amber-300">02</p>
                         <p className="text-[8px] font-black uppercase text-indigo-200/50">Suspensions DJ/C</p>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
