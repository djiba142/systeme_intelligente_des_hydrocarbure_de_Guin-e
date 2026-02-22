import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Loader2,
  Trash2
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const reportTypes = [
  {
    id: 'stock-national',
    title: 'Rapport Stock National',
    description: 'Vue consolidée des stocks par région et entreprise',
    icon: BarChart3,
    frequency: 'Quotidien',
    lastGenerated: '01/02/2026',
  },
  {
    id: 'consommation',
    title: 'Rapport de Consommation',
    description: 'Analyse des ventes et tendances de consommation',
    icon: TrendingUp,
    frequency: 'Hebdomadaire',
    lastGenerated: '27/01/2026',
  },
  {
    id: 'alertes',
    title: 'Rapport des Alertes',
    description: 'Historique des ruptures et situations critiques',
    icon: PieChart,
    frequency: 'Mensuel',
    lastGenerated: '01/01/2026',
  },
  {
    id: 'importations',
    title: 'Rapport des Importations',
    description: 'Suivi des cargaisons et déchargements au port',
    icon: FileSpreadsheet,
    frequency: 'Hebdomadaire',
    lastGenerated: '28/01/2026',
  },
];

export default function RapportsPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Load recent reports from local storage or database
  useEffect(() => {
    loadRecentReports();
  }, []);

  const loadRecentReports = async () => {
    try {
      const stored = localStorage.getItem('generated_reports');
      if (stored) {
        const reports = JSON.parse(stored).sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);
        setRecentReports(reports);
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const saveReportToHistory = (reportName: string, reportType: string, size: string) => {
    try {
      const stored = localStorage.getItem('generated_reports') || '[]';
      const reports = JSON.parse(stored);

      const newReport = {
        id: Date.now(),
        name: reportName,
        type: reportType,
        date: new Date().toLocaleDateString('fr-FR'),
        size: size,
        createdAt: new Date().toISOString(),
      };

      reports.push(newReport);
      localStorage.setItem('generated_reports', JSON.stringify(reports.slice(-20))); // Keep last 20

      setRecentReports([newReport, ...reports.slice(0, 4)]);
    } catch (error) {
      console.error('Erreur sauvegarde rapport:', error);
    }
  };

  // Helper functions to fetch data
  const fetchStockData = async () => {
    // 1 & 2. Fetch Entreprises and Stations in parallel
    let orgQuery = supabase.from('entreprises').select('id, nom, sigle');
    let stationsQuery = supabase.from('stations').select('id, entreprise_id, stock_essence, stock_gasoil, statut');

    // Auth Filtering
    if (profile?.entreprise_id) {
      orgQuery = orgQuery.eq('id', profile.entreprise_id);
      stationsQuery = stationsQuery.eq('entreprise_id', profile.entreprise_id);
    }

    const [orgRes, stationsRes] = await Promise.all([
      orgQuery,
      stationsQuery
    ]);

    if (orgRes.error) throw orgRes.error;
    if (stationsRes.error) throw stationsRes.error;

    const organisations = orgRes.data;
    const stations = stationsRes.data;

    // 3. Process Data
    const entreprisesData = organisations.map(org => {
      const orgStations = stations.filter(s => s.entreprise_id === org.id);
      const stockEssence = orgStations.reduce((acc, s) => acc + (s.stock_essence || 0), 0);
      const stockGasoil = orgStations.reduce((acc, s) => acc + (s.stock_gasoil || 0), 0);

      return {
        nom: org.nom,
        sigle: org.sigle,
        stockEssence,
        stockGasoil,
        stations: orgStations.length
      };
    });

    const totalStockEssence = entreprisesData.reduce((acc, e) => acc + e.stockEssence, 0);
    const totalStockGasoil = entreprisesData.reduce((acc, e) => acc + e.stockGasoil, 0);
    const totalStations = stations.length;

    const CONSOMMATION_JOURNALIERE = {
      essence: 800000,
      gasoil: 1200000,
    };

    return {
      entreprises: entreprisesData,
      totals: {
        essence: totalStockEssence,
        gasoil: totalStockGasoil,
        stations: totalStations
      },
      autonomieEssence: Math.round(totalStockEssence / CONSOMMATION_JOURNALIERE.essence),
      autonomieGasoil: Math.round(totalStockGasoil / CONSOMMATION_JOURNALIERE.gasoil),
    };
  };

  const fetchAlertsData = async () => {
    let query = supabase
      .from('alertes')
      .select('*, station:stations(nom)')
      .order('created_at', { ascending: false });

    if (profile?.entreprise_id) {
      query = query.eq('entreprise_id', profile.entreprise_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const fetchImportData = async () => {
    const { data, error } = await supabase
      .from('importations')
      .select('*')
      .order('date_arrivee_prevue', { ascending: true });
    if (error) throw error;
    return data;
  };

  const handleGenerate = async (type: string, title: string, isPrinting = false) => {
    try {
      if (type === 'stock-national') {
        const data = await fetchStockData();
        await generateNationalStockPDF({ ...data, isPrinting });
      } else if (type === 'alertes') {
        const data = await fetchAlertsData();
        await generateCustomReportPDF({ type, title, data, isPrinting });
      } else if (type === 'importations') {
        const data = await fetchImportData();
        await generateCustomReportPDF({ type, title, data, isPrinting });
      } else {
        await generateCustomReportPDF({ type, title, data: { message: "Données non disponibles" }, isPrinting });
      }

      // Save to history only if downloading
      if (!isPrinting) {
        saveReportToHistory(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`, type, '~2 MB');

        toast({
          title: "Succès",
          description: `Le fichier ${title} a été téléchargé avec les données à jour.`,
        });
      } else {
        toast({
          title: "Impression",
          description: "Fenêtre d'impression ouverte.",
        });
      }
    } catch (err: any) {
      console.error("Erreur génération rapport :", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message || "Impossible de générer le fichier",
      });
    }
  };

  const deleteReport = (reportId: number) => {
    try {
      const stored = localStorage.getItem('generated_reports') || '[]';
      const reports = JSON.parse(stored).filter((r: any) => r.id !== reportId);
      localStorage.setItem('generated_reports', JSON.stringify(reports));
      setRecentReports(reports);

      toast({
        title: "Succès",
        description: "Rapport supprimé de l'historique.",
      });
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  return (
    <DashboardLayout
      title="Rapports"
      subtitle="Génération et historique des rapports"
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {reportTypes.map((report) => (
          <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <report.icon className="h-8 w-8 text-primary" />
                <Badge variant="secondary" className="text-[10px]">
                  {report.frequency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-sm mb-1">{report.title}</CardTitle>
              <CardDescription className="text-xs mb-3">
                {report.description}
              </CardDescription>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Dernier: {report.lastGenerated}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  disabled={generating === report.id}
                  onClick={async () => {
                    setGenerating(report.id);
                    try {
                      await handleGenerate(report.id, report.title);
                    } finally {
                      setGenerating(null);
                    }
                  }}
                >
                  {generating === report.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Générer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Custom Report */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapport Personnalisé
            </CardTitle>
            <CardDescription>
              Générer un rapport sur une période spécifique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de rapport</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock-national">Stock National</SelectItem>
                  <SelectItem value="consommation">Consommation</SelectItem>
                  <SelectItem value="alertes">Alertes</SelectItem>
                  <SelectItem value="importations">Importations</SelectItem>
                  <SelectItem value="prix">Conformité des Prix</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 gap-2"
                disabled={generatingCustom || !selectedType || !dateDebut || !dateFin}
                onClick={async () => {
                  if (!selectedType || !dateDebut || !dateFin) {
                    toast({
                      variant: 'destructive',
                      title: 'Champs manquants',
                      description: 'Type + dates obligatoires',
                    });
                    return;
                  }

                  setGeneratingCustom(true);
                  try {
                    await handleGenerate(selectedType, `Rapport Personnalisé ${selectedType}`);
                  } finally {
                    setGeneratingCustom(false);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {generatingCustom ? 'Génération...' : 'PDF'}
              </Button>

              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={async () => {
                  if (!selectedType) {
                    toast({
                      variant: 'destructive',
                      title: 'Erreur',
                      description: 'Veuillez sélectionner un type de rapport.',
                    });
                    return;
                  }

                  try {
                    let data;
                    if (selectedType === 'stock-national') {
                      const stockData = await fetchStockData();
                      // Flatten for Excel
                      data = stockData.entreprises;
                    } else if (selectedType === 'alertes') {
                      data = await fetchAlertsData();
                    } else if (selectedType === 'importations') {
                      data = await fetchImportData();
                    } else {
                      data = [{ message: "Pas de données exportables pour ce type" }];
                    }

                    if (!data || data.length === 0) {
                      toast({ title: "Info", description: "Aucune donnée à exporter." });
                      return;
                    }

                    // Generate CSV
                    const headers = Object.keys(data[0]).join(',');
                    const rows = data.map((row: any) => Object.values(row).map(v =>
                      typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
                    ).join(',')).join('\n');
                    const csvContent = headers + '\n' + rows;

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `${selectedType}_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    toast({
                      title: 'Succès',
                      description: 'Fichier Excel/CSV généré.',
                    });
                  } catch (e: any) {
                    console.error(e);
                    toast({ variant: 'destructive', title: 'Erreur Export', description: e.message });
                  }
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel / CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Rapports Récents</CardTitle>
                <CardDescription>
                  Historique des derniers rapports générés
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filtrer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingReports ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Chargement des rapports...
                </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun rapport généré pour le moment.</p>
                  <p className="text-xs">Les rapports générés apparaîtront ici.</p>
                </div>
              ) : (
                recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.date} • {report.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleGenerate(report.type, report.name, true)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleGenerate(report.type, report.name, false)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}