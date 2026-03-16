import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, TrendingUp, TrendingDown, Activity, Battery, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Données de consommation trimestrielle
const dataTrimestrielle = [
  { trimestre: 'T1 2025', essence: 18200, gasoil: 24600 },
  { trimestre: 'T2 2025', essence: 19800, gasoil: 26100 },
  { trimestre: 'T3 2025', essence: 21400, gasoil: 28300 },
  { trimestre: 'T4 2025', essence: 20100, gasoil: 27500 },
  { trimestre: 'T1 2026', essence: 22300, gasoil: 30200 },
];

// Répartition par région
const dataRegion = [
  { name: 'Conakry', value: 35, color: '#0ea5e9' },
  { name: 'Kindia', value: 15, color: '#10b981' },
  { name: 'Boké', value: 18, color: '#f59e0b' },
  { name: 'Labé', value: 8, color: '#8b5cf6' },
  { name: 'Kankan', value: 10, color: '#ef4444' },
  { name: 'Mamou', value: 5, color: '#06b6d4' },
  { name: 'N\'Zérékoré', value: 6, color: '#ec4899' },
  { name: 'Faranah', value: 3, color: '#84cc16' },
];

// Données mensuelles détaillées
const dataMensuelle = [
  { mois: 'Oct', essence: 6200, gasoil: 7100 },
  { mois: 'Nov', essence: 6450, gasoil: 7350 },
  { mois: 'Déc', essence: 6900, gasoil: 7800 },
  { mois: 'Jan', essence: 7100, gasoil: 8200 },
  { mois: 'Fév', essence: 6800, gasoil: 7550 },
  { mois: 'Mars', essence: 7300, gasoil: 8400 },
];

export default function StatistiquesPage() {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { role, profile } = useAuth();

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await generateCustomReportPDF({
        type: 'consommation-nationale',
        title: 'STATISTIQUES NATIONALES DE CONSOMMATION',
        dateDebut: '01/01/2026',
        dateFin: new Date().toLocaleDateString('fr-FR'),
        signerRole: role || 'analyste',
        signerName: profile?.full_name || 'Analyste SONAP',
      });
      toast({ title: 'Export réussi', description: 'Le rapport PDF a été téléchargé.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur d\'export', description: String(err) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout title="Statistiques Nationales">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statistiques Nationales</h1>
            <p className="text-muted-foreground mt-1">
              Données de consommation et distribution à l'échelle nationale
            </p>
          </div>
          <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Génération...' : 'Exporter les données (PDF)'}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consommation Totale (30j)</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14 350 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+2.5%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Répartition Essence</CardTitle>
              <Battery className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6 800 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-red-500 font-medium">-1.2%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Répartition Gasoil</CardTitle>
              <Battery className="h-4 w-4 text-stone-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7 550 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+4.1%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Régions Couvertes</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8 / 8</div>
              <p className="text-xs text-muted-foreground mt-1">
                Couverture nationale complète
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Graphique barres: Évolution trimestrielle */}
          <Card className="col-span-1 md:col-span-2 shadow-sm border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>Évolution de la consommation par trimestre</CardTitle>
              <CardDescription>
                Analyse comparative des volumes de distribution (m³)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataTrimestrielle} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="trimestre" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString('fr-FR')} m³`]} />
                    <Legend />
                    <Bar dataKey="essence" name="Essence" fill="#f59e0b" radius={[4,4,0,0]} />
                    <Bar dataKey="gasoil" name="Gasoil" fill="#64748b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique camembert: Répartition régionale */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Répartition par région</CardTitle>
              <CardDescription>Part de la consommation nationale (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataRegion} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {dataRegion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique barres mensuelles */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Tendances mensuelles (6 mois)</CardTitle>
              <CardDescription>Volume distribué en m³</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataMensuelle}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString('fr-FR')} m³`]} />
                    <Legend />
                    <Bar dataKey="essence" name="Essence" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="gasoil" name="Gasoil" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
