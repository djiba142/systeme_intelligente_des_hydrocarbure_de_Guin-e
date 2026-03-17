import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Loader2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Shield,
  History,
  Building2,
  Lock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateNationalStockPDF, generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';
import { cn } from '@/lib/utils';

interface ReportType {
  id: string;
  title: string;
  titleFull?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  frequency: string;
  lastGenerated: string;
  roles?: string[];
}

interface RecentReport {
  id: number;
  name: string;
  type: string;
  date: string;
  size: string;
  createdAt: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'stock-national',
    title: 'Rapport Stock National',
    description: 'Vue consolidée des stocks par région et entreprise',
    icon: BarChart3,
    frequency: 'Quotidien',
    lastGenerated: 'En temps réel',
    roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'agent_supervision_aval', 'controleur_distribution']
  },
  {
    id: 'consommation-nationale',
    title: 'Consommation Nationale',
    description: 'Analyse globale des ventes par produit et région',
    icon: TrendingUp,
    frequency: 'Hebdomadaire',
    lastGenerated: '08/03/2026',
    roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'agent_supervision_aval', 'inspecteur']
  },
  {
    id: 'performance-entreprises',
    title: 'Performance Entreprises',
    description: 'Classement et quotas des sociétés pétrolières',
    icon: BarChart3,
    frequency: 'Mensuel',
    lastGenerated: '01/03/2026',
    roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'inspecteur']
  },
  {
    id: 'prevision-penurie',
    title: 'Prévision de Pénurie',
    description: 'Analyse prédictive des risques de rupture',
    icon: AlertCircle,
    frequency: 'Quotidien',
    lastGenerated: '09/03/2026',
    roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'analyste', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution']
  },
  {
    id: 'flux-aval',
    title: 'Flux Logistique Aval',
    description: 'Suivi des ravitaillements secondaires et quotas DSA',
    icon: FileSpreadsheet,
    frequency: 'Quotidien',
    lastGenerated: 'En temps réel',
    roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'agent_supervision_aval', 'controleur_distribution', 'gestionnaire_livraisons']
  },
  {
    id: 'stock-station',
    title: 'Rapport Stock Station',
    description: 'Niveaux de cuves et historiques de jauges certifiés',
    icon: BarChart3,
    frequency: 'Quotidien',
    lastGenerated: 'En temps réel',
    roles: ['super_admin', 'secretaire_general', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'agent_supervision_aval', 'controleur_distribution']
  },
  {
    id: 'ventes-station',
    title: 'Rapport Ventes Station',
    description: 'Journal des transactions de piste et recettes quotidiennes',
    icon: TrendingUp,
    frequency: 'Quotidien',
    lastGenerated: 'En temps réel',
    roles: ['super_admin', 'secretaire_general', 'responsable_entreprise', 'responsable_stations', 'operateur_entreprise', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'agent_supervision_aval', 'controleur_distribution']
  },
  {
    id: 'livraisons-station',
    title: 'Rapport des Livraisons',
    description: 'Historique des ravitaillements reçus par camion-citerne',
    icon: FileSpreadsheet,
    frequency: 'Hebdomadaire',
    lastGenerated: '07/03/2026',
    roles: ['super_admin', 'secretaire_general', 'responsable_entreprise', 'gestionnaire_livraisons', 'operateur_entreprise', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'agent_supervision_aval', 'controleur_distribution']
  },
  {
    id: 'inspections-terrain',
    title: 'Rapport d\'Inspections',
    description: 'Compte-rendu des visites et anomalies détectées',
    icon: FileText,
    frequency: 'Hebdomadaire',
    lastGenerated: '09/03/2026',
    roles: ['inspecteur', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat']
  },
  {
    id: 'conformite-prix',
    title: 'Conformité des Prix',
    description: 'Contrôle du respect des prix officiels en station',
    icon: AlertCircle,
    frequency: 'Hebdomadaire',
    lastGenerated: '09/03/2026',
    roles: ['inspecteur', 'super_admin', 'directeur_general', 'admin_etat']
  },
  {
    id: 'sante-systeme',
    title: 'Santé du Système',
    description: 'Disponibilité des capteurs IoT et services Cloud',
    icon: RefreshCw,
    frequency: 'Quotidien',
    lastGenerated: 'En temps réel',
    roles: ['service_it', 'super_admin', 'directeur_general']
  }
];


function PartnerLogo({ src, sigle, color }: { src: string, sigle: string, color: string }) {
  const [error, setError] = useState(false);
  
  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden">
      {error ? (
        <span 
          style={{ 
            fontSize: '24px', 
            fontWeight: 900, 
            color: color || '#64748b' 
          }}
          className="animate-in fade-in zoom-in duration-300"
        >
          {(sigle && sigle.length > 0) ? sigle[0] : 'P'}
        </span>
      ) : (
        <img 
          src={src} 
          alt={sigle} 
          className="h-full w-full object-contain animate-in fade-in duration-500" 
          onError={() => setError(true)} 
        />
      )}
    </div>
  );
}

export default function RapportsPage() {
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [dataStats, setDataStats] = useState({ entreprises: 0, stations: 0, alertes: 0, importations: 0 });
  const [entrepriseLogo, setEntrepriseLogo] = useState<string | undefined>(undefined);

  const isGeneratingRef = React.useRef(false);

  useEffect(() => {
    loadRecentReports();
    loadDataStats();
    fetchEntrepriseLogo();
    const timer = setTimeout(() => setLoadingReports(false), 800);
    return () => clearTimeout(timer);
  }, [profile?.entreprise_id]);

  const loadDataStats = async () => {
    try {
      const [entRes, staRes, alertRes, impRes] = await Promise.all([
        supabase.from('entreprises').select('id', { count: 'exact', head: true }),
        supabase.from('stations').select('id', { count: 'exact', head: true }),
        supabase.from('alertes').select('id', { count: 'exact', head: true }),
        supabase.from('importations').select('id', { count: 'exact', head: true }),
      ]);
      setDataStats({
        entreprises: entRes.count ?? 0,
        stations: staRes.count ?? 0,
        alertes: alertRes.count ?? 0,
        importations: impRes.count ?? 0,
      });
    } catch (err) {
      console.error('Stats loading error:', err);
    }
  };

  const fetchEntrepriseLogo = async () => {
    if (profile?.entreprise_id) {
      const { data } = await supabase
        .from('entreprises')
        .select('logo_url')
        .eq('id', profile.entreprise_id)
        .maybeSingle();
      if (data?.logo_url) setEntrepriseLogo(data.logo_url);
    }
  };

  const loadRecentReports = useCallback(() => {
    try {
      const stored = localStorage.getItem('generated_reports');
      if (stored) {
        const reports: RecentReport[] = JSON.parse(stored)
          .sort((a: RecentReport, b: RecentReport) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 10);
        setRecentReports(reports);
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    }
  }, []);

  const saveReportToHistory = (reportName: string, reportType: string, size: string) => {
    try {
      const stored = localStorage.getItem('generated_reports') || '[]';
      const reports: RecentReport[] = JSON.parse(stored);

      const newReport: RecentReport = {
        id: Date.now(),
        name: reportName,
        type: reportType,
        date: new Date().toLocaleDateString('fr-FR'),
        size: size,
        createdAt: new Date().toISOString(),
      };

      reports.push(newReport);
      localStorage.setItem('generated_reports', JSON.stringify(reports.slice(-20)));

      setRecentReports(prev => [newReport, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Erreur sauvegarde rapport:', error);
    }
  };

  const handleGenerate = async (type: string, title: string, isPrinting = false) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setGenerating(type + (isPrinting ? '-print' : ''));

    try {
      if (type === 'stock-national') {
        // Fetch real data for PDF
        const { data: orgRes } = await supabase.from('entreprises').select('id, nom, sigle');
        const { data: stationsRes } = await supabase.from('stations').select('id, entreprise_id, stock_essence, stock_gasoil');
        
        const entreprises = (orgRes || []).map(org => {
          const orgStations = (stationsRes || []).filter(s => s.entreprise_id === org.id);
          return {
            nom: org.nom,
            sigle: org.sigle,
            stations: orgStations.length,
            stockEssence: orgStations.reduce((acc, s) => acc + (s.stock_essence || 0), 0),
            stockGasoil: orgStations.reduce((acc, s) => acc + (s.stock_gasoil || 0), 0),
          };
        });

        await generateNationalStockPDF({
          entreprises,
          totals: {
            essence: entreprises.reduce((acc, e) => acc + e.stockEssence, 0),
            gasoil: entreprises.reduce((acc, e) => acc + e.stockGasoil, 0),
            stations: entreprises.reduce((acc, e) => acc + e.stations, 0),
          },
          autonomieEssence: 12, // Mock or calculate
          autonomieGasoil: 15,
          signerRole: role || undefined,
          signerName: profile?.full_name || undefined,
          entrepriseLogo: entrepriseLogo
        });
      } else {
        // Simple custom report for other types
        await generateCustomReportPDF({ 
          type, 
          title,
          signerRole: role || undefined,
          signerName: profile?.full_name || undefined,
          entrepriseLogo: entrepriseLogo
        });
      }
      
      if (!isPrinting) {
        saveReportToHistory(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`, type, '~1.5 MB');
        toast({ title: "✅ Succès", description: `Rapport "${title}" généré.` });
      } else {
        toast({ title: "🖨️ Impression", description: "Module d'impression lancé." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setGenerating(null);
      setTimeout(() => { isGeneratingRef.current = false; }, 800);
    }
  };

  const deleteReport = (reportId: number) => {
    const stored = localStorage.getItem('generated_reports') || '[]';
    const reports = JSON.parse(stored).filter((r: RecentReport) => r.id !== reportId);
    localStorage.setItem('generated_reports', JSON.stringify(reports));
    setRecentReports(reports.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10));
  };

  const handleExportExcel = async () => {
    if (!selectedType) return;
    try {
      toast({ title: "Export Excel", description: "Préparation des données certifiées..." });
      
      let headers: string[] = [];
      let data: any[][] = [];
      let title = "Export de Données SIHG";

      if (selectedType === 'stock-national') {
        const { data: stations } = await supabase.from('stations').select('nom, region, stock_essence, stock_gasoil');
        headers = ["Station", "Région", "Stock Essence (L)", "Stock Gasoil (L)"];
        data = (stations || []).map(s => [s.nom, s.region, s.stock_essence, s.stock_gasoil]);
        title = "RELEVE NATIONAL DES STOCKS S.I.H.G";
      } else if (selectedType === 'alertes') {
        const { data: alertes } = await supabase.from('alertes').select('created_at, type, message, niveau').limit(100);
        headers = ["Date", "Type Alerte", "Description", "Gravité"];
        data = (alertes || []).map(a => [new Date(a.created_at).toLocaleString('fr-FR'), a.type, a.message, a.niveau]);
        title = "REGISTRE DES ALERTES ET INCIDENTS";
      } else if (selectedType === 'importations') {
        const { data: imports } = await supabase.from('importations').select('navire_nom, carburant, quantite_tonnes, statut');
        headers = ["Nom Navire", "Produit", "Quantité (Tonnes)", "Statut"];
        data = (imports || []).map(i => [i.navire_nom, i.carburant, i.quantite_tonnes, i.statut]);
        title = "SUIVI DES IMPORTATIONS NATIONALES";
      } else {
        toast({ variant: "destructive", title: "Non supporté", description: "Ce type de rapport n'est pas encore optimisé pour Excel." });
        return;
      }

      await generateExcelReport({
        title,
        filename: `Export_SIHG_${selectedType}_${new Date().toISOString().slice(0, 10)}`,
        headers,
        data,
        signerRole: role || undefined,
        signerName: profile?.full_name || 'Agent SIHG'
      });
      
      toast({ title: "✅ Export Terminé", description: "Le fichier Excel a été généré avec succès." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur Export", description: err.message });
    }
  };

  return (
    <DashboardLayout title="Rapports & Statistiques" subtitle="Génération de rapports officiels SONAP / SIHG">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-10 bg-card rounded-[2.5rem] border border-border shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-[120px] group-hover:bg-primary/10 transition-colors" />
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
              <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Archives Nationales Digitale</span>
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter mb-3 uppercase">Centre de Rapports</h2>
          <p className="text-muted-foreground max-w-lg leading-relaxed text-sm font-medium">
            Accédez aux données certifiées de la Société Nationale des Pétroles. 
            Génération sécurisée de rapports d'audit et de flux stratégiques.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 bg-muted/30 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Authentifié par</p>
            <p className="text-xs font-black text-foreground tracking-tight">SIHG HUB CONAKRY</p>
          </div>
          <div className="flex items-center gap-4">
            <img src={logo} alt="SIHG" className="h-16 w-auto drop-shadow-lg" />
            <div className="h-12 w-[1px] bg-border/50" />
            <img src={sonapLogo} alt="SONAP" className="h-14 w-auto drop-shadow-lg rounded-xl" />
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <div className="mb-10 p-8 bg-card border border-border rounded-[2rem] shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-xs font-black text-foreground uppercase tracking-[0.25em]">Compagnies Nationales et Partenaires</h3>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-border to-transparent mx-6" />
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { logo: logoTotal, sigle: 'TOTAL', name: 'TotalEnergies Marketing', color: '#E63946' },
            { logo: logoShell, sigle: 'SHELL', name: 'Vivo Energy Guinée', color: '#F4A261' },
            { logo: logoTMI, sigle: 'TMI', name: 'TMI Logistics', color: '#2A9D8F' },
            { logo: logoKP, sigle: 'KP', name: 'Kamsar Petroleum', color: '#264653' },
          ].map((ent) => (
            <div key={ent.sigle} className="group/card flex items-center gap-5 p-5 rounded-3xl border border-border bg-muted/10 hover:bg-muted/30 hover:shadow-xl hover:border-primary/20 transition-all duration-500">
              <div className="h-16 w-16 rounded-2xl bg-white p-2 border border-slate-100 shadow-md flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 group-hover/card:rotate-2 transition-all">
                <PartnerLogo src={ent.logo} sigle={ent.sigle} color={ent.color} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-foreground tracking-tighter truncate">{ent.sigle}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight truncate opacity-60">{ent.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {reportTypes
          .filter(report => !report.roles || (role && report.roles.includes(role)))
          .map((report) => (
            <Card key={report.id} className="group cursor-pointer hover:shadow-2xl hover:border-primary/30 transition-all duration-300 rounded-[1.5rem] border-border overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-transform group-hover:scale-110">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    {report.frequency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <CardTitle className="text-sm font-black mb-2 uppercase tracking-tight">{report.title}</CardTitle>
                <CardDescription className="text-xs font-medium leading-relaxed mb-6 opacity-70 min-h-[40px]">
                  {report.description}
                </CardDescription>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic truncate flex-1 opacity-50">
                    MAJ: {report.lastGenerated}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary"
                      disabled={generating === report.id + '-print'}
                      onClick={(e) => { e.stopPropagation(); handleGenerate(report.id, report.title, true); }}
                    >
                      {generating === report.id + '-print' ? <Loader2 className="h-3 w-3 animate-spin"/> : <Printer className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-[10px] font-black gap-2 border-primary/30 text-primary hover:bg-primary hover:text-white"
                      disabled={generating === report.id}
                      onClick={(e) => { e.stopPropagation(); handleGenerate(report.id, report.title); }}
                    >
                      {generating === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Custom Generator */}
        <Card className="lg:col-span-1 border-border rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-black">
              <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
              RAPPORT PERSONNALISÉ
            </CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-50 italic">
              Certification de données ad-hoc
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type de rapport</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12 rounded-xl border-border bg-muted/20 font-bold focus:ring-primary/20">
                  <SelectValue placeholder="Séléctionner Nature du Flux" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="stock-national">Stock National Consolidé</SelectItem>
                  <SelectItem value="consommation">Analyse de Consommation</SelectItem>
                  <SelectItem value="alertes">Registre des Alertes</SelectItem>
                  <SelectItem value="importations">Suivi des Navires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date Début</Label>
                <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="h-12 rounded-xl border-border bg-muted/20 font-bold focus:ring-primary/20" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date Fin</Label>
                <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-12 rounded-xl border-border bg-muted/20 font-bold focus:ring-primary/20" />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button className="flex-1 h-14 rounded-2xl gap-3 shadow-xl shadow-primary/20 text-md font-black italic group" 
                disabled={generatingCustom || !selectedType || !dateDebut || !dateFin} 
                onClick={() => {
                  setGeneratingCustom(true);
                  handleGenerate(selectedType, "Rapport Personnalisé").finally(() => setGeneratingCustom(false));
                }}
              >
                {generatingCustom ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" /> }
                EXTRAIRE PDF
              </Button>
              <Button variant="outline" className="h-14 w-14 rounded-2xl border-border hover:bg-muted text-primary" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-2 border-border rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
          <CardHeader className="p-8 pb-4 border-b border-border/30 bg-muted/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-black">
                <History className="h-6 w-6 text-primary" />
                HISTORIQUE DE GÉNÉRATION
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest hover:text-destructive" onClick={() => { localStorage.removeItem('generated_reports'); setRecentReports([]); }}>
                Vider
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[450px]">
            {recentReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-20">
                <History className="h-16 w-16 mb-4" />
                <p className="font-black uppercase tracking-[0.2em] text-sm italic">Aucun document archivé</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentReports.map((report) => (
                  <div key={report.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group/row">
                    <div className="flex items-center gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-inner group-hover/row:scale-110 group-hover/row:bg-primary/10 transition-all">
                        <FileText className="h-7 w-7 text-primary/40 group-hover/row:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="font-black text-[13px] tracking-tight truncate max-w-[200px] md:max-w-md uppercase">{report.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                           <span className="text-[10px] font-black text-white px-2 py-0.5 bg-primary/80 rounded-full lowercase tracking-tighter">{report.type}</span>
                           <span className="text-[10px] font-bold text-muted-foreground italic opacity-60 underline underline-offset-4 decoration-primary/30">{report.date} • {report.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-all rounded-xl hover:bg-destructive/10" onClick={() => deleteReport(report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                       <Button size="icon" variant="ghost" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" onClick={() => handleGenerate(report.type, report.name)}>
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-muted/20 border-t border-border/30 flex items-center justify-center">
             <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                <Lock className="h-3 w-3" />
                Dépôt sécurisé SONAP-SIHG
             </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}