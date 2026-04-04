import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateExcelReport } from '@/lib/excelExport';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { fetchAuditLogs } from '@/lib/auditLog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, RefreshCw, Loader2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logAuditAction } from '@/lib/auditLog';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';

type AuditRowData = {
  id?: string;
  user_email?: string;
  action_type?: string;
  resource_type?: string;
  resource_name?: string;
  details?: Record<string, any>;
  status?: string;
  error_message?: string;
  created_at?: string;
};

export default function AuditPage() {
  const { role: currentUserRole, profile } = useAuth();
  const [logs, setLogs] = useState<AuditRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    userEmail: '',
    actionType: '',
    startDate: '',
    endDate: ''
  });

  const { toast } = useToast();

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      loadLogs();
      isFirstLoad.current = false;
    }
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchAuditLogs({
        userEmail: filters.userEmail || undefined,
        actionType: filters.actionType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit: 100
      });

      if (fetchError) throw fetchError;
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError(err.message || 'Erreur lors du chargement des logs. Vérifiez que la migration SQL a été exécutée.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const testAudit = async () => {
    setLoading(true);
    try {
      const { success, error: logError } = await logAuditAction({
        action_type: 'VIEW',
        resource_type: 'audit_test',
        resource_name: 'Test de connexion Audit',
        status: 'success',
        details: { test: true, timestamp: new Date().toISOString() }
      });

      if (!success) throw new Error(logError);
      
      toast({
        title: "Test d'audit envoyé",
        description: "L'action a été enregistrée. Rechargement des logs...",
      });
      
      // Delay slightly to allow DB to process
      setTimeout(loadLogs, 1000);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Échec du test",
        description: "La table 'audit_logs' n'est probablement pas encore créée.",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (logs.length === 0) {
      toast({ title: 'Attention', description: 'Aucune donnée à exporter' });
      return;
    }

    const headers = ['Date', 'Utilisateur', 'Action', 'Ressource', 'Statut', 'Détails'];
    const data = logs.map(log => [
      log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '',
      log.user_email || '',
      log.action_type || '',
      log.resource_name || log.resource_type || '',
      log.status || '',
      log.details ? JSON.stringify(log.details) : ''
    ]);

    await generateExcelReport({
      title: 'Journaux d\'Audit et de Sécurité - SIHG SONAP',
      filename: `Audit_Logs_SIHG_${new Date().toISOString().slice(0, 10)}`,
      headers,
      data,
      signerRole: currentUserRole || 'admin_etat',
      signerName: profile?.full_name || 'Administrateur SIHG',
      sheetName: 'Logs Audit'
    });

    logAuditAction({
      action_type: 'EXPORT',
      resource_type: 'audit_logs',
      resource_name: 'Exportation des logs d\'audit vers Excel',
      status: 'success'
    });
  };

  const getActionBadgeColor = (action?: string) => {
    const colors: Record<string, string> = {
      'LOGIN': 'bg-blue-100 text-blue-800 border-blue-200',
      'VIEW': 'bg-gray-100 text-gray-800 border-gray-200',
      'CREATE': 'bg-green-100 text-green-800 border-green-200',
      'UPDATE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'DELETE': 'bg-red-100 text-red-800 border-red-200',
      'EXPORT': 'bg-purple-100 text-purple-800 border-purple-200',
      'DOWNLOAD': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return cn("border font-bold uppercase text-[10px]", colors[action || ''] || 'bg-gray-100 text-gray-800');
  };

  const getStatusBadgeColor = (status?: string) => {
    return status === 'success'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const formatSafeDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "-" : d.toLocaleString('fr-FR');
    } catch {
      return "-";
    }
  };

  return (
    <DashboardLayout
      title="Audit & Transparence"
      subtitle="Historique complet des opérations stratégiques"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 italic">Plateforme Certifiée National</span>
          </div>
          <h2 className="text-4xl font-black font-display tracking-tighter uppercase mb-2">Journaux d'Audit</h2>
          <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed italic opacity-80">
            Traçabilité immuable des activités administratives et flux logistiques du SIHG.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-inner">
          <img src={logo} alt="SIHG" className="h-12 w-auto brightness-0 invert opacity-90" />
          <div className="h-10 w-[1px] bg-white/10"></div>
          <img src={sonapLogo} alt="SONAP" className="h-12 w-auto brightness-0 invert opacity-90" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6 rounded-2xl border-rose-200 bg-rose-50 text-rose-900 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <AlertDescription className="font-bold text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Alert */}
      <Alert className="mb-8 bg-indigo-50 border-indigo-100 rounded-2xl shadow-sm border-l-4 border-l-indigo-500">
        <AlertCircle className="h-5 w-5 text-indigo-600" />
        <AlertDescription className="text-indigo-800 font-medium flex items-center justify-between gap-4">
          <span>Le système d'audit est prêt. Si aucun log n'apparaît, assurez-vous d'avoir appliqué la migration SQL dans l'interface Supabase.</span>
          {currentUserRole === 'service_it' && (
            <Button size="sm" variant="outline" className="bg-white hover:bg-indigo-100 border-indigo-200 text-indigo-700 font-black text-[10px] uppercase tracking-widest gap-2 flex-shrink-0" onClick={testAudit} disabled={loading}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
              Tester la liaison
            </Button>
          )}
        </AlertDescription>
      </Alert>

      {/* Filters Card */}
      <Card className="mb-8 border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Paramètres de Recherche</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email utilisateur</label>
              <Input
                placeholder="ex: admin@sonap.gn"
                value={filters.userEmail}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nature de l'Action</label>
              <Select value={filters.actionType || 'ALL'} onValueChange={(value) => handleFilterChange('actionType', value === 'ALL' ? '' : value)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  <SelectItem value="LOGIN">Connexion</SelectItem>
                  <SelectItem value="VIEW">Consultation</SelectItem>
                  <SelectItem value="CREATE">Création</SelectItem>
                  <SelectItem value="UPDATE">Modification</SelectItem>
                  <SelectItem value="DELETE">Suppression</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="DOWNLOAD">Téléchargement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Période Début</label>
              <Input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Période Fin</label>
              <Input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={loadLogs} disabled={loading} className="h-12 px-8 rounded-xl font-black italic shadow-lg shadow-primary/20 bg-slate-900 hover:bg-black text-white dark:bg-primary dark:hover:bg-primary/90">
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
              LANCER LA RECHERCHE
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
              onClick={() => {
                setFilters({ userEmail: '', actionType: '', startDate: '', endDate: '' });
                setError(null);
                setTimeout(loadLogs, 100);
              }}
            >
              RÉINITIALISER
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Registre Stratégique</CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500 italic mt-1 uppercase tracking-widest opacity-60">
              {loading ? 'Interrogation des registres...' : `${logs.length} événement${logs.length !== 1 ? 's' : ''} indexé${logs.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          <Button
            onClick={exportToExcel}
            disabled={logs.length === 0 || loading}
            className="h-10 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-5"
          >
            <Download size={16} />
            EXPORTER EXCEL
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="font-black uppercase tracking-[0.2em] text-sm">Archivage en cours...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-30 text-center px-10">
              <Shield className="h-16 w-16 mb-2" />
              <p className="font-black uppercase tracking-widest text-sm">Aucun log indexé pour cette période.</p>
              <p className="text-xs font-medium max-w-sm">Le système enregistrera automatiquement toutes les futures actions dès que la configuration initiale sera validée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5 pl-8">Date / Heure</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Identité</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Adresse IP / Appareil</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Action</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Ressource Ciblée</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Détails Techniques</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-5">Certification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="py-5 pl-8 font-mono text-[11px] text-slate-500">
                        {formatSafeDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{log.user_email || 'Système'}</div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-slate-600">{(log as any).ip_address || '—'}</span>
                          <span className="text-[9px] text-slate-400">{(log as any).details?.device_id || 'Browser'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge className={getActionBadgeColor(log.action_type)}>
                          {log.action_type || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                         <div className="flex items-center gap-2">
                           <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight truncate max-w-[150px]">
                             {log.resource_name || log.resource_type || '-'}
                           </span>
                         </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="max-w-[200px] bg-slate-100 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          {log.error_message ? (
                            <div className="text-[10px] text-rose-600 font-bold leading-tight">{log.error_message}</div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 truncate italic">
                              {log.details ? JSON.stringify(log.details) : '—'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full", getStatusBadgeColor(log.status))}>
                          {log.status === 'success' ? '✓ RÉUSSI' : '✗ ÉCHEC'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
