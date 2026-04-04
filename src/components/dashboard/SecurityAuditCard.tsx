import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Users, Calendar, AlertCircle, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function SecurityAuditCard() {
  const { role, profile } = useAuth();
  const { data: summary, isLoading } = useQuery({
    queryKey: ['weekly-security-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_security_summary' as any)
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadPDF = async () => {
    if (!summary || summary.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    try {
      await generateCustomReportPDF({
        type: 'audit-securite',
        title: 'RAPPORT D\'AUDIT DE SÉCURITÉ HEBDOMADAIRE',
        data: summary,
        signerRole: role || 'admin_etat',
        signerName: profile?.full_name || 'Direction SONAP'
      });
      toast.success("Rapport PDF généré avec succès");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Erreur lors de l'exportation PDF");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg animate-pulse">
        <CardHeader><div className="h-6 w-48 bg-slate-200 rounded"></div></CardHeader>
        <CardContent><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>)}</div></CardContent>
      </Card>
    );
  }

  const criticalEvents = summary?.filter((s: any) => s.status === 'failed' || s.action_type === 'role_change') || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Échecs Connexion</p>
              <p className="text-2xl font-black text-slate-900">
                {summary?.filter((s: any) => s.action_type === 'login' && s.status === 'failed').reduce((acc: number, cur: any) => acc + cur.event_count, 0) || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Changements Rôles</p>
              <p className="text-2xl font-black text-slate-900">
                {summary?.filter((s: any) => s.action_type === 'role_change').reduce((acc: number, cur: any) => acc + cur.event_count, 0) || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Score Sécurité</p>
              <p className="text-2xl font-black text-emerald-600">98%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
        <CardHeader className="bg-slate-900 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Journal d'Audit Hebdomadaire
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold italic uppercase text-[10px] mt-1">
                Analyse des 7 derniers jours — Rapport généré en temps réel
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold gap-2"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" />
                Exporter PDF
              </Button>
              <Badge className="bg-primary text-slate-900 font-black px-4 py-1">RAPPORT CONFIDENTIEL</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {summary && summary.length > 0 ? (
              summary.map((event: any, idx: number) => (
                <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex items-start justify-between gap-6 group">
                  <div className="flex gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                      event.status === 'failed' ? "bg-red-50 text-red-600 border-red-100" : 
                      event.action_type === 'role_change' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {event.status === 'failed' ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {event.action_type === 'login' ? 'Tentative de Connexion' : 
                           event.action_type === 'role_change' ? 'Modification Privilèges' : 
                           event.action_type === 'data_access' ? 'Accès Données Sensibles' : event.action_type}
                        </span>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          event.status === 'failed' ? "bg-red-600 text-white" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {event.status === 'failed' ? 'ÉCHEC' : 'SUCCÈS'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {event.event_count} occurrence(s) détectée(s) le {format(new Date(event.event_date), 'EEEE dd MMMM', { locale: fr })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.users_involved?.slice(0, 3).map((u: string, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                            {u}
                          </span>
                        ))}
                        {(event.users_involved?.length || 0) > 3 && (
                          <span className="text-[9px] font-bold text-slate-400">+{event.users_involved.length - 3} autres</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Risque</p>
                    <div className="flex items-center gap-1 justify-end">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className={cn(
                          "h-1 w-4 rounded-full",
                          event.status === 'failed' && s <= 4 ? "bg-red-500" : 
                          event.action_type === 'role_change' && s <= 3 ? "bg-amber-500" :
                          s <= 1 ? "bg-emerald-500" : "bg-slate-200"
                        )}></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <ShieldCheck className="h-16 w-16 mx-auto text-emerald-100 mb-4" />
                <h3 className="text-sm font-black text-slate-900 uppercase">Aucun incident de sécurité</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Le système est actuellement dans un état nominal.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
