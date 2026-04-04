import { useState } from 'react';
import { 
    ClipboardCheck, Save, Send, Camera, AlertTriangle, 
    Fuel, DollarSign, CheckCircle2, XCircle, Info, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InspectionFormProps {
    mission: any;
    onComplete: () => void;
    onCancel: () => void;
}

export function InspectionForm({ mission, onComplete, onCancel }: InspectionFormProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        etat_station: 'conforme',
        stock_essence_reel: '',
        stock_gasoil_reel: '',
        prix_essence_constate: '',
        prix_gasoil_constate: '',
        est_conforme: true,
        observations: '',
        anomalies: [] as string[],
    });

    const steps = [
        { id: 1, title: 'Stocks & Prix', icon: Fuel },
        { id: 2, title: 'Conformité', icon: ClipboardCheck },
        { id: 3, title: 'Observations', icon: Info },
    ];

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (isFinal: boolean) => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const reportData = {
                mission_id: mission.id,
                inspecteur_id: user.id,
                station_id: mission.station_id,
                etat_station: formData.etat_station,
                stock_essence_reel: parseInt(formData.stock_essence_reel) || 0,
                stock_gasoil_reel: parseInt(formData.stock_gasoil_reel) || 0,
                prix_essence_constate: parseInt(formData.prix_essence_constate) || 0,
                prix_gasoil_constate: parseInt(formData.prix_gasoil_constate) || 0,
                est_conforme: formData.est_conforme,
                observations: formData.observations,
                anomalies_detectees: formData.anomalies,
                statut: isFinal ? 'soumis' : 'brouillon'
            };

            const { error } = await (supabase as any)
                .from('inspections_rapports')
                .upsert(reportData);

            if (error) throw error;

            if (isFinal) {
                // Mettre à jour le statut de la mission
                await (supabase as any)
                    .from('inspections_missions')
                    .update({ statut: 'achevee' })
                    .eq('id', mission.id);
            }

            toast({
                title: isFinal ? "Rapport soumis" : "Brouillon enregistré",
                description: `L'inspection pour ${mission.station?.nom} a été enregistrée.`
            });

            if (isFinal) onComplete();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: error.message
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 px-4">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className={cn(
                            "flex flex-col items-center gap-2 transition-all duration-300",
                            step >= s.id ? "text-blue-600" : "text-slate-300"
                        )}>
                            <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                                step === s.id ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200" :
                                step > s.id ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-white border-slate-100 text-slate-300"
                            )}>
                                <s.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{s.title}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "h-0.5 flex-1 mx-4 rounded-full transition-all duration-500",
                                step > s.id ? "bg-blue-600" : "bg-slate-100"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <ClipboardCheck className="h-8 w-8 text-blue-400" />
                                Inspection : {mission.station?.nom}
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                                {mission.station?.ville} • {mission.numero_mission}
                            </CardDescription>
                        </div>
                        <Badge className="bg-blue-600 text-white border-none px-4 py-1 font-black">ÉTAPE {step} / 3</Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center gap-4">
                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Fuel className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h3 className="font-black text-xs uppercase text-blue-900 tracking-widest">Relevé des Stocks</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Stock Essence (L)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Ex: 15000" 
                                            className="h-12 rounded-xl focus:ring-blue-600"
                                            value={formData.stock_essence_reel}
                                            onChange={(e) => setFormData({...formData, stock_essence_reel: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Stock Gasoil (L)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Ex: 22000" 
                                            className="h-12 rounded-xl"
                                            value={formData.stock_gasoil_reel}
                                            onChange={(e) => setFormData({...formData, stock_gasoil_reel: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-4">
                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <DollarSign className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <h3 className="font-black text-xs uppercase text-emerald-900 tracking-widest">Prix Constatés (GNF)</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix Essence /L</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Ex: 12000" 
                                            className="h-12 rounded-xl"
                                            value={formData.prix_essence_constate}
                                            onChange={(e) => setFormData({...formData, prix_essence_constate: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix Gasoil /L</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Ex: 12000" 
                                            className="h-12 rounded-xl"
                                            value={formData.prix_gasoil_constate}
                                            onChange={(e) => setFormData({...formData, prix_gasoil_constate: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={cn(
                                    "p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center gap-4",
                                    formData.est_conforme ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-slate-100 text-slate-400 grayscale"
                                )} onClick={() => setFormData({...formData, est_conforme: true, etat_station: 'conforme'})}>
                                    <CheckCircle2 className="h-10 w-10" />
                                    <div>
                                        <p className="font-black uppercase text-sm">Station Conforme</p>
                                        <p className="text-[10px] font-bold opacity-70">Tout est en règle sur le terrain</p>
                                    </div>
                                </div>

                                <div className={cn(
                                    "p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center gap-4",
                                    !formData.est_conforme ? "bg-red-50 border-red-500 text-red-900" : "bg-white border-slate-100 text-slate-400 grayscale"
                                )} onClick={() => setFormData({...formData, est_conforme: false, etat_station: 'non_conforme'})}>
                                    <XCircle className="h-10 w-10" />
                                    <div>
                                        <p className="font-black uppercase text-sm">Non-Conformité</p>
                                        <p className="text-[10px] font-bold opacity-70">Des anomalies ont été détectées</p>
                                    </div>
                                </div>
                            </div>

                            {!formData.est_conforme && (
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Types d'anomalies</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Fraude Prix', 'Rupture non déclarée', 'Hygiène', 'Sécurité', 'Matériel Défectueux'].map(anom => (
                                            <Badge 
                                                key={anom}
                                                variant={formData.anomalies.includes(anom) ? 'default' : 'outline'}
                                                className="cursor-pointer h-8 px-4 font-black text-[10px] uppercase rounded-full"
                                                onClick={() => {
                                                    const cur = formData.anomalies;
                                                    if (cur.includes(anom)) setFormData({...formData, anomalies: cur.filter(a => a !== anom)});
                                                    else setFormData({...formData, anomalies: [...cur, anom]});
                                                }}
                                            >
                                                {anom}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Observations détaillées</Label>
                                <Textarea 
                                    placeholder="Décrivez précisément les points d'inspection..." 
                                    className="min-h-[200px] rounded-3xl p-6"
                                    value={formData.observations}
                                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                                />
                            </div>
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 border-dashed text-center space-y-3">
                                <Camera className="h-10 w-10 text-slate-300 mx-auto" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Preuves Photographiques</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">Cliquez pour téléverser des photos du terrain (Optionnel)</p>
                                </div>
                                <Button variant="outline" size="sm" className="rounded-xl border-slate-200">Choisir des fichiers</Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-slate-50 p-8 flex items-center justify-between border-t border-slate-100">
                    <div className="flex gap-3">
                         <Button variant="outline" className="rounded-xl" onClick={onCancel}>Annuler</Button>
                         <Button variant="secondary" className="rounded-xl" onClick={() => handleSubmit(false)} disabled={submitting}>
                            <Save className="h-4 w-4 mr-2" /> Brouillon
                         </Button>
                    </div>

                    <div className="flex gap-3">
                        {step > 1 && (
                            <Button variant="outline" onClick={prevStep} className="rounded-xl">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                            </Button>
                        )}
                        {step < 3 ? (
                            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest px-8" onClick={nextStep}>
                                Continuer <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button className="rounded-xl bg-slate-900 hover:bg-black font-black uppercase text-[10px] tracking-widest px-8" onClick={() => handleSubmit(true)} disabled={submitting}>
                                {submitting ? 'Envoi...' : 'Soumettre le Rapport'} <Send className="h-4 w-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>

            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-[10px] font-bold text-amber-900 uppercase">Avertissement : Toute fausse déclaration est passible de sanctions administratives et pénales conformément à la réglementation en vigueur.</p>
            </div>
        </div>
    );
}
