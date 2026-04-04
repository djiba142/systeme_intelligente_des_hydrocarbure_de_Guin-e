import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ship, Anchor, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ImportPortReceptionPage() {
  const { user, role } = useAuth();
  const [cargaisons, setCargaisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const canProcess = role === 'agent_reception_port' || role === 'super_admin' || role === 'chef_service_importation';

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch targaisons that are expected at the port ('prevue', 'en_transit', or 'arrive')
      const { data, error } = await supabase
        .from('import_cargaisons')
        .select(`
          *,
          import_navires (nom, imo_number),
          import_dossiers (numero_dossier, quantite_prevue, import_produits (nom))
        `)
        .in('statut', ['prevue', 'en_transit', 'arrive'])
        .order('date_chargement', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "import_cargaisons" does not exist')) {
          console.warn("Table import_cargaisons not found yet.");
          setCargaisons([]);
          return;
        }
        throw error;
      }
      
      setCargaisons(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors du chargement des cargaisons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmArrival = async (cargaisonId: string, expectedQuantity: number) => {
    const actualQStr = quantities[cargaisonId];
    if (!actualQStr) {
      toast.error("Veuillez saisir la quantité réelle mesurée à quai.");
      return;
    }

    const actualQ = parseFloat(actualQStr);
    if (isNaN(actualQ) || actualQ <= 0) {
      toast.error("Quantité invalide.");
      return;
    }

    setActionLoading(cargaisonId);
    try {
      // 1. Insert into port_receptions log
      const { error: logError } = await supabase.from('port_receptions').insert({
        cargaison_id: cargaisonId,
        agent_id: user?.id,
        actual_quantity: actualQ,
        arrival_timestamp: new Date().toISOString()
      });

      if (logError) throw logError;

      // 2. Update cargaison status
      const { error: updateError } = await supabase.from('import_cargaisons')
        .update({ statut: 'arrive', quantite_reelle: actualQ })
        .eq('id', cargaisonId);

      if (updateError) throw updateError;

      toast.success("Arrivée du navire confirmée avec succès !");
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de la confirmation");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = useMemo(() => cargaisons.filter(c => c.statut !== 'arrive').length, [cargaisons]);
  const arrivedCount = useMemo(() => cargaisons.filter(c => c.statut === 'arrive').length, [cargaisons]);

  return (
    <DashboardLayout title="Réception au Port" subtitle="Enregistrement des navires accostés et confirmation des volumes réels">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-700">Navires en approche</CardTitle>
            <CardDescription className="text-3xl font-black text-indigo-900">{pendingCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-700">Arrivées confirmées</CardTitle>
            <CardDescription className="text-3xl font-black text-emerald-900">{arrivedCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Action Requise</CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-2">
              Seul l'agent de réception portuaire peut valider une arrivée physique.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Anchor className="h-5 w-5 text-indigo-600" />
          Planning d'accostage
        </h3>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : cargaisons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Ship className="h-16 w-16 mb-4 text-slate-200" />
              <p className="font-bold text-lg">Aucun navire attendu</p>
              <p className="text-sm">Les cargaisons annoncées par la direction apparaîtront ici.</p>
            </CardContent>
          </Card>
        ) : (
          cargaisons.map((c) => (
            <Card key={c.id} className="border-none shadow-md overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="bg-slate-900 text-white p-6 flex flex-col justify-center items-center w-full md:w-48 shrink-0">
                  <Ship className="h-10 w-10 mb-2 text-indigo-400" />
                  <span className="font-black text-center leading-tight">{c.import_navires?.nom || 'Navire Inconnu'}</span>
                  <Badge variant="outline" className="mt-2 border-white/20 text-white/70 text-[10px]">
                    IMO: {c.import_navires?.imo_number || 'N/A'}
                  </Badge>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">Dossier: {c.import_dossiers?.numero_dossier}</h4>
                        <p className="text-sm text-slate-500 font-medium">
                          Produit: <span className="text-indigo-600 font-bold">{c.import_dossiers?.import_produits?.nom || 'Non spécifié'}</span>
                        </p>
                      </div>
                      <Badge className={c.statut === 'arrive' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                        {c.statut === 'arrive' ? 'ARRIVÉ AU PORT' : 'EN APPROCHE'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Quantité Attendue (BL)</p>
                        <p className="font-mono font-bold text-slate-700">{Number(c.import_dossiers?.quantite_prevue || 0).toLocaleString()} MT</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Date Chargement Départ</p>
                        <p className="font-medium text-slate-700">{c.date_chargement ? new Date(c.date_chargement).toLocaleDateString() : 'Non communiquée'}</p>
                      </div>
                    </div>
                  </div>

                  {c.statut !== 'arrive' ? (
                    <div className="flex flex-col md:flex-row items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-indigo-900 mb-1 block">Quantité Réelle Mesurée (MT)</label>
                        <Input 
                          type="number" 
                          placeholder="Ex: 25000"
                          value={quantities[c.id] || ''}
                          onChange={(e) => setQuantities({ ...quantities, [c.id]: e.target.value })}
                          className="border-indigo-200 bg-white"
                        />
                      </div>
                      <Button 
                        onClick={() => handleConfirmArrival(c.id, c.import_dossiers?.quantite_prevue)}
                        disabled={!canProcess || actionLoading === c.id}
                        className="w-full md:w-auto mt-5 bg-indigo-600 hover:bg-indigo-700"
                      >
                        {actionLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Confirmer l'Accostage
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-bold text-sm">Navire réceptionné et quantité enregistrée ({Number(c.quantite_reelle || 0).toLocaleString()} MT). En attente d'inspection qualité.</span>
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
