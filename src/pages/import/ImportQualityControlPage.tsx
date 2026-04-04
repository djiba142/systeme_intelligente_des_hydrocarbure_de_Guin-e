import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ship, CheckCircle2, ClipboardCheck, XCircle, Beaker, FileSearch, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function ImportQualityControlPage() {
  const { user, role } = useAuth();
  const [cargaisons, setCargaisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Form states per cargaison
  const [forms, setForms] = useState<Record<string, {
    quantity_verified: string,
    comments: string,
    laboratory_report_url: string
  }>>({});

  const canProcess = role === 'inspecteur' || role === 'super_admin' || role === 'agent_technique_aval';

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch targaisons that are at the port ('arrive') or already inspected ('conforme', 'non_conforme')
      const { data, error } = await supabase
        .from('import_cargaisons')
        .select(`
          *,
          import_navires (nom, imo_number),
          import_dossiers (numero_dossier, quantite_prevue, import_produits (nom))
        `)
        .in('statut', ['arrive', 'conforme', 'non_conforme'])
        .order('date_chargement', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "import_cargaisons" does not exist')) {
          setCargaisons([]);
          return;
        }
        throw error;
      }
      
      setCargaisons(data || []);
      
      // Initialize forms for new
      const currentForms = { ...forms };
      (data || []).forEach((c) => {
        if (!currentForms[c.id]) {
          currentForms[c.id] = {
            quantity_verified: c.quantite_reelle ? c.quantite_reelle.toString() : '',
            comments: '',
            laboratory_report_url: ''
          };
        }
      });
      setForms(currentForms);

    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors du chargement des cargaisons à inspecter");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleValidation = async (cargaisonId: string, isCompliant: boolean) => {
    const formData = forms[cargaisonId];
    if (!formData) return;

    if (!formData.quantity_verified) {
      toast.error("Veuillez confirmer la quantité mesurée post-inspection.");
      return;
    }

    if (!isCompliant && !formData.comments) {
      toast.error("Vous devez fournir un commentaire explicatif pour un rejet (Non Conforme).");
      return;
    }

    setActionLoading(cargaisonId);
    try {
      // 1. Insert into quality_controls log
      const { error: logError } = await supabase.from('quality_controls').insert({
        cargaison_id: cargaisonId,
        inspector_id: user?.id,
        is_compliant: isCompliant,
        quantity_verified: parseFloat(formData.quantity_verified),
        laboratory_report_url: formData.laboratory_report_url || null,
        comments: formData.comments || null
      });

      if (logError) throw logError;

      // 2. Update cargaison status
      const newStatut = isCompliant ? 'conforme' : 'non_conforme';
      const { error: updateError } = await supabase.from('import_cargaisons')
        .update({ statut: newStatut })
        .eq('id', cargaisonId);

      if (updateError) throw updateError;

      toast.success(isCompliant ? "Cargaison déclarée Conforme." : "Cargaison bloquée pour Non-Conformité.");
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de l'inspection");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = useMemo(() => cargaisons.filter(c => c.statut === 'arrive').length, [cargaisons]);

  return (
    <DashboardLayout title="Contrôle Qualité" subtitle="Inspection des hydrocarbures au port et validation de conformité">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
              <Beaker className="h-4 w-4" /> En Attente de Labo
            </CardTitle>
            <CardDescription className="text-3xl font-black text-amber-900">{pendingCount}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Traçabilité Assurée
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">
              Aucune cargaison ne peut être transférée vers les dépôts sans cette certification.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
          Registres d'Inspection
        </h3>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : cargaisons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <CheckCircle2 className="h-16 w-16 mb-4 text-slate-200" />
              <p className="font-bold text-lg">Aucune cargaison à inspecter</p>
              <p className="text-sm">Toutes les cargaisons arrivées au port ont déjà été traitées.</p>
            </CardContent>
          </Card>
        ) : (
          cargaisons.map((c) => (
            <Card key={c.id} className="border-none shadow-md overflow-hidden relative">
              {c.statut === 'non_conforme' && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-red-500"></div>
              )}
              {c.statut === 'conforme' && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500"></div>
              )}
              
              <div className="flex flex-col md:flex-row">
                <div className="bg-slate-50 p-6 flex flex-col justify-center items-center w-full md:w-56 shrink-0 border-r border-slate-100">
                  <Ship className="h-10 w-10 mb-2 text-slate-400" />
                  <span className="font-black text-center leading-tight text-slate-800">{c.import_navires?.nom || 'Navire'}</span>
                  <Badge variant="outline" className="mt-2 border-slate-200 text-slate-500 text-[10px]">
                    IMO: {c.import_navires?.imo_number || 'N/A'}
                  </Badge>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">Cargaison {c.import_dossiers?.import_produits?.nom || ''}</h4>
                        <p className="text-sm text-slate-500 font-medium">Reçu le : {new Date(c.date_dechargement || c.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge className={
                        c.statut === 'conforme' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 
                        c.statut === 'non_conforme' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                        'bg-amber-100 text-amber-800 hover:bg-amber-100'
                      }>
                        {c.statut.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Stockage Réel Mesuré (Port)</p>
                      <p className="font-mono font-bold text-slate-700 bg-slate-100 inline-block px-3 py-1 rounded-md">
                        {Number(c.quantite_reelle || 0).toLocaleString()} MT
                      </p>
                    </div>
                  </div>

                  {c.statut === 'arrive' ? (
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm mt-2">
                       <h5 className="font-bold text-sm text-amber-800 mb-4 flex items-center gap-2">
                         <Beaker className="h-4 w-4" /> Rapport d'Inspection Laboratoire
                       </h5>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Qté Confirmée Labo (MT)</label>
                            <Input 
                              type="number" 
                              value={forms[c.id]?.quantity_verified || ''}
                              onChange={(e) => setForms({...forms, [c.id]: {...forms[c.id], quantity_verified: e.target.value}})}
                              className="border-slate-200 bg-slate-50"
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Lien du Rapport Officiel (.pdf)</label>
                            <Input 
                              type="text" 
                              placeholder="https://..."
                              value={forms[c.id]?.laboratory_report_url || ''}
                              onChange={(e) => setForms({...forms, [c.id]: {...forms[c.id], laboratory_report_url: e.target.value}})}
                              className="border-slate-200 bg-slate-50"
                            />
                         </div>
                       </div>
                       
                       <div className="mb-6">
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Observations & Remarques</label>
                          <Textarea 
                            placeholder="Détails sur la température, densité, etc..."
                            value={forms[c.id]?.comments || ''}
                            onChange={(e) => setForms({...forms, [c.id]: {...forms[c.id], comments: e.target.value}})}
                            className="border-slate-200 bg-slate-50 min-h-[80px]"
                          />
                       </div>

                       <div className="flex flex-col sm:flex-row items-center gap-3">
                         <Button 
                           onClick={() => handleValidation(c.id, true)}
                           disabled={!canProcess || actionLoading === c.id}
                           className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white"
                         >
                           {actionLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                           DÉCLARER CONFORME
                         </Button>
                         <Button 
                           onClick={() => handleValidation(c.id, false)}
                           disabled={!canProcess || actionLoading === c.id}
                           variant="outline"
                           className="w-full sm:w-1/2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                         >
                           {actionLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                           BLOQUER (NON CONFORME)
                         </Button>
                       </div>
                    </div>
                  ) : (
                    <div className={c.statut === 'conforme' ? 'text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-start gap-3 mt-4' : 'text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-3 mt-4'}>
                      {c.statut === 'conforme' ? <CheckCircle2 className="h-5 w-5 mt-0.5" /> : <AlertTriangle className="h-5 w-5 mt-0.5" />}
                      <div>
                        <span className="font-bold text-sm block">Cargaison {c.statut === 'conforme' ? 'validée avec succès' : 'rejetée et bloquée'}.</span>
                        <span className="text-xs block mt-1">Le dossier a été clôturé pour le contrôle qualité et {c.statut === 'conforme' ? 'est prêt pour transfert aux dépôts' : 'exige une investigation'}.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
