import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, AlertCircle, BarChart, FileSearch, Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Données de prévision
const dataPrevisionEssence = [
  { mois: 'Avr', reel: 22000, prevu: 22500 },
  { mois: 'Mai', reel: 23200, prevu: 23800 },
  { mois: 'Juin', reel: 24100, prevu: 24500 },
  { mois: 'Juil', reel: null, prevu: 25400 },
  { mois: 'Août', reel: null, prevu: 26100 },
  { mois: 'Sep', reel: null, prevu: 25800 },
];

const dataPrevisionGasoil = [
  { mois: 'Avr', reel: 38500, prevu: 39000 },
  { mois: 'Mai', reel: 39800, prevu: 40200 },
  { mois: 'Juin', reel: 41200, prevu: 41000 },
  { mois: 'Juil', reel: null, prevu: 42100 },
  { mois: 'Août', reel: null, prevu: 43500 },
  { mois: 'Sep', reel: null, prevu: 44200 },
];

const dataRisqueRegional = [
  { region: 'Conakry', risque: 12, stock: 85 },
  { region: 'Kindia', risque: 25, stock: 68 },
  { region: 'Boké', risque: 45, stock: 42 },
  { region: 'Labé', risque: 30, stock: 55 },
  { region: 'Kankan', risque: 18, stock: 72 },
  { region: 'Mamou', risque: 35, stock: 50 },
  { region: 'N\'Zérékoré', risque: 40, stock: 45 },
  { region: 'Faranah', risque: 28, stock: 60 },
];

export default function PrevisionsPage() {
  const [exportingRapport, setExportingRapport] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { toast } = useToast();
  const { role, profile } = useAuth();

  const handleNouveauRapport = async () => {
    setExportingRapport(true);
    try {
      await generateCustomReportPDF({
        type: 'consommation-nationale',
        title: 'RAPPORT DE PREVISIONS ENERGETIQUES - GUINEE',
        dateDebut: '01/04/2026',
        dateFin: '30/09/2026',
        signerRole: role || 'analyste',
        signerName: profile?.full_name || 'Cellule de Planification Énergétique',
      });
      toast({ title: 'Rapport généré', description: 'Le rapport de prévisions a été téléchargé avec succès.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: String(err) });
    } finally {
      setExportingRapport(false);
    }
  };

  const handleExportStrategique = async () => {
    setExportingPDF(true);
    try {
      await generateCustomReportPDF({
        type: 'stock-national',
        title: 'RAPPORT STRATEGIQUE - SECURITE ENERGETIQUE NATIONALE',
        dateDebut: '01/01/2026',
        dateFin: new Date().toLocaleDateString('fr-FR'),
        signerRole: role || 'analyste',
        signerName: profile?.full_name || 'Intelligence Énergétique SONAP',
        data: {
          entreprises: [
            { nom: 'TotalEnergies Guinée', sigle: 'TOTAL', stockEssence: 120450, stockGasoil: 145800, stations: 5 },
            { nom: 'Vivo Energy Guinée', sigle: 'SHELL', stockEssence: 134000, stockGasoil: 340000, stations: 5 },
            { nom: 'Kamsar Petroleum', sigle: 'KP', stockEssence: 115000, stockGasoil: 235000, stations: 5 },
            { nom: 'Trade Marine International', sigle: 'TMI', stockEssence: 96000, stockGasoil: 121000, stations: 5 },
            { nom: 'Star Oil Guinée', sigle: 'STAR', stockEssence: 72000, stockGasoil: 123000, stations: 5 },
          ],
        },
      });
      toast({ title: 'Export réussi', description: 'Le rapport stratégique PDF a été téléchargé.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: String(err) });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <DashboardLayout title="Prévisions Énergétiques">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prévisions Énergétiques</h1>
            <p className="text-muted-foreground mt-1">
              Anticipation de la demande nationale et prévision des besoins d'importation
            </p>
          </div>
          <Button onClick={handleNouveauRapport} disabled={exportingRapport} className="gap-2">
            {exportingRapport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {exportingRapport ? 'Génération...' : 'Nouveau Rapport'}
          </Button>
        </div>

        <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Alerte de Prévision - Trimestre 3</AlertTitle>
          <AlertDescription className="text-blue-700/80 dark:text-blue-400/80">
            Une hausse de la demande de Gasoil de 15% est prévue dans la région de Boké en raison de l'augmentation des activités minières. Un ajustement des quotas d'importation est recommandé.
          </AlertDescription>
        </Alert>

        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Demande Projetée (Essence)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">25 400 <span className="text-base font-normal text-muted-foreground">m³ / mois</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Prévision calculée sur les 6 prochains mois avec une croissance moyenne estimée à 3,4%.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <TrendingUp className="h-5 w-5 text-stone-500" />
                Demande Projetée (Gasoil)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">42 100 <span className="text-base font-normal text-muted-foreground">m³ / mois</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Prévision impactée par les grands travaux de la rentrée économique (croissance : +8,2%).
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Déficit Stratégique Est.
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-amber-500">1 200 <span className="text-base font-normal text-muted-foreground">m³ (Gasoil)</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Gap prévu pour le mois d'octobre si les arrivages n'augmentent pas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques de prévision */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-t-4 border-t-emerald-500">
            <CardHeader>
              <CardTitle>Prévision Essence - S2 2026</CardTitle>
              <CardDescription>Consommation réelle vs modèle prédictif (m³)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataPrevisionEssence}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number | null) => value ? [`${value.toLocaleString('fr-FR')} m³`] : ['—']} />
                    <Legend />
                    <Area type="monotone" dataKey="prevu" name="Prévu" stroke="#10b981" fill="#10b98130" strokeWidth={2} strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="reel" name="Réel" stroke="#f59e0b" fill="#f59e0b30" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-stone-500">
            <CardHeader>
              <CardTitle>Prévision Gasoil - S2 2026</CardTitle>
              <CardDescription>Consommation réelle vs modèle prédictif (m³)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataPrevisionGasoil}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number | null) => value ? [`${value.toLocaleString('fr-FR')} m³`] : ['—']} />
                    <Legend />
                    <Area type="monotone" dataKey="prevu" name="Prévu" stroke="#64748b" fill="#64748b30" strokeWidth={2} strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="reel" name="Réel" stroke="#3b82f6" fill="#3b82f630" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modèle prédictif global + Risque régional */}
        <Card className="shadow-sm border-t-4 border-t-indigo-500">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Analyse des Risques Régionaux</CardTitle>
              <CardDescription>
                Indice de risque de pénurie par région et niveau de stock disponible (%)
              </CardDescription>
            </div>
            <Button onClick={handleExportStrategique} disabled={exportingPDF} variant="outline" className="gap-2">
              {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportingPDF ? 'Génération...' : 'Exporter PDF Stratégique'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataRisqueRegional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="region" fontSize={11} angle={-15} textAnchor="end" height={50} />
                  <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number, name: string) => [`${value}%`, name === 'risque' ? 'Indice de Risque' : 'Stock Disponible']} />
                  <Legend />
                  <Line type="monotone" dataKey="risque" name="Risque Pénurie" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="stock" name="Stock Disponible" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
