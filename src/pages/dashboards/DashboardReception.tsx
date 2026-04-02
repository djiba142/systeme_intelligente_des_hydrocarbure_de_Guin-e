import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { logCreateResource } from '@/lib/auditLog';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  History, 
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  Database,
  User,
  Scan,
  FileSearch,
  CheckCircle,
  XCircle,
  Loader2,
  MoreVertical,
  Bell,
  Send,
  RotateCcw,
  File,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast'; // Keep this one
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { sendNotification } from '@/lib/notifications'; // New import
import { cn } from '@/lib/utils'; // New import for cn

interface ReceivedDossier {
  id: string;
  numero_dossier: string;
  type_dossier: string;
  statut: string;
  created_at: string;
  dossier_documents?: { url_pdf: string }[];
  entreprise_id?: string;
  entreprises?: { nom: string; sigle: string };
}

const TYPE_DOSSIER_OPTIONS = [
  { value: 'agrement', label: 'Demande Agrément', target: 'Services Aval (DSA)' },
  { value: 'licence', label: 'Demande / Renouvellement Licence', target: 'Services Aval (DSA)' },
  { value: 'administratif', label: 'Dossier Administratif Standard', target: 'Direction Administrative (DA)' },
  { value: 'juridique', label: 'Dossier Juridique (Contentieux, etc.)', target: 'Direction Juridique (DJC)' },
];

const TYPE_DEMANDE_OPTIONS = [
  { value: 'nouvelle_demande', label: 'Nouvelle Demande' },
  { value: 'renouvellement', label: 'Renouvellement' },
  { value: 'reclamation', label: 'Réclamation / Plainte' },
  { value: 'autre', label: 'Autre document' },
];

export const DashboardReception = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [entiteNom, setEntiteNom] = useState('');
  const [typeDossier, setTypeDossier] = useState('');
  const [typeDemande, setTypeDemande] = useState('');
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [recentDossiers, setRecentDossiers] = useState<ReceivedDossier[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const fetchRecentDossiers = async () => {
    setIsLoadingList(true);
    try {
      let query = (supabase as any)
        .from('dossiers_entreprise')
        .select('*, dossier_documents(url_pdf)')
        .order('created_at', { ascending: false })
        .limit(10);
        
      // Filter by user if not admin/dg
      if (role !== 'super_admin' && role !== 'directeur_general' && role !== 'admin_etat' && user?.id) {
        query = query.eq('created_by', user.id);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      setRecentDossiers((data as any[]) || []);
    } catch (err) {
      console.error('Erreur chargement dossiers', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentDossiers();

      // Real-time subscription
      const channel = supabase
        .channel('public:dossiers_entreprise')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_entreprise' }, () => {
          fetchRecentDossiers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({ title: "Format invalide", description: "Seuls les fichiers PDF sont acceptés.", variant: "destructive" });
        return;
      }
      setScannedFile(file);
      toast({ title: "Fichier prêt", description: `${file.name} sélectionné pour la transmission.` });
    }
  };

  const handleReceiveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entiteNom || !typeDossier || !typeDemande || !scannedFile) {
      toast({
        title: "Dossier Incomplet",
        description: "Veuillez remplir tous les champs et joindre le fichier PDF obligatoire.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Generate unique DOS-YEAR-XXXX number
      const year = new Date().getFullYear();
      
      // Récupérer le nombre de dossiers de l'année pour créer une séquence
      const { count, error: countError } = await (supabase as any)
        .from('dossiers_entreprise')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01T00:00:00.000Z`);
        
      const sequence = ((count || 0) + 1).toString().padStart(4, '0');
      const numeroDossier = `DOS-${year}-${sequence}`;

      // 2. Identify target orientation for status
      let finalStatut: 'numerise' | 'en_analyse_tech' | 'en_analyse_admin' | 'en_analyse_jur' = 'numerise';
      let targetDirection = 'Services Aval (DSA)';
      
      if (typeDossier === 'agrement' || typeDossier === 'licence') {
        finalStatut = 'numerise'; // Move to DSA
        targetDirection = 'Direction des Services Aval (DSA)';
      } else if (typeDossier === 'administratif') {
        finalStatut = 'en_analyse_admin'; // Directly for DA if admin
        targetDirection = 'Direction Administrative (DA)';
      } else if (typeDossier === 'juridique') {
        finalStatut = 'en_analyse_jur'; // Directly for DJ if jur
        targetDirection = 'Direction Juridique (DJ/C)';
      }

      // 3. Create Dossière Entry
      const { data: insertedDossier, error: dosError } = await (supabase as any).from('dossiers_entreprise').insert({
        numero_dossier: numeroDossier,
        type_dossier: typeDossier,
        type_demande: typeDemande,
        entite_nom: entiteNom,
        statut: finalStatut,
        description: `Demande de ${typeDemande} pour ${entiteNom}`,
        created_by: user?.id,
        // entreprise_id is optional at this stage, so we avoid FK violation on dummy 0000... uuid
      }).select().single();

      if (dosError) throw dosError;

      // 4. Upload file and bind to dossier_documents
      if (scannedFile && insertedDossier) {
        const fileExt = scannedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${numeroDossier}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dossiers')
          .upload(filePath, scannedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dossiers')
          .getPublicUrl(filePath);
        
        // Insert into dossier_documents
        await (supabase as any).from('dossier_documents').insert({
          dossier_id: insertedDossier.id,
          type_document: 'demande_signee',
          nom_fichier: scannedFile.name,
          url_pdf: publicUrl,
          uploaded_by: user?.id
        });
      }

      await logCreateResource(
        'dossiers_entreprise',
        `Réception du dossier ${numeroDossier} (${typeDossier}) et orientation vers ${finalStatut}`,
        { numero_dossier: numeroDossier, entite_nom: entiteNom, type_dossier: typeDossier }
      );

      // 3. Real-time Notifications for the target direction
      try {
        // Envoi d'une notification générale ou à un groupe (on simule ici l'envoi aux responsables)
        await sendNotification({
          userId: '00000000-0000-0000-0000-000000000000', // Notification système globale ou broadcast
          title: "Nouveau Dossier Reçu",
          message: `Un nouveau dossier (${numeroDossier}) pour ${entiteNom} a été orienté vers votre direction (${targetDirection}).`,
          type: 'info'
        });
      } catch (notifErr) {
        console.error("Erreur notification", notifErr);
      }

      toast({
        title: "Dossier Enregistré et Orienté",
        description: `Le dossier ${numeroDossier} a été automatiquement transféré à la ${targetDirection}.`,
        variant: "default"
      });

      // Reset form
      setEntiteNom('');
      setTypeDossier('');
      setTypeDemande('');
      setScannedFile(null);
      fetchRecentDossiers();

    } catch (error: any) {
      console.error('Erreur insertion', error);
      toast({
        title: "Erreur Système",
        description: error.message || "Impossible d'enregistrer le dossier.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeObj = TYPE_DOSSIER_OPTIONS.find(t => t.value === typeDossier);

  return (
    <DashboardLayout
      title="Module Réception & Courrier"
      subtitle="Point d'entrée unique et numérisation des flux documentaires SONAP"
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" />
              Réception Nationale des Hydrocarbures
            </h2>
            <p className="text-sm text-slate-500 mt-1 uppercase font-bold tracking-widest text-[10px]">
              Système de Traitement en temps réel
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-2 border-slate-200 shadow-lg bg-white overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Enregistrement Dossier Physique
              </CardTitle>
              <CardDescription className="text-white/60">
                Saisissez les informations primaires. L'orientation vers la direction concernée est automatique.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleReceiveDossier} className="space-y-6">
                
                <div className="space-y-2">
                  <Label htmlFor="entiteNom" className="text-xs font-black uppercase tracking-tighter text-slate-500">Nom de l'Entreprise / Demandeur *</Label>
                  <Input 
                    id="entiteNom"
                    placeholder="Ex: Vivo Energy Guinée, Station SONAP Kaloum..."
                    value={entiteNom}
                    onChange={(e) => setEntiteNom(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-tighter text-slate-500">Type de Dossier *</Label>
                    <Select value={typeDossier} onValueChange={setTypeDossier} required>
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12">
                        <SelectValue placeholder="Choisir le type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_DOSSIER_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-tighter text-slate-500">Type de Demande *</Label>
                    <Select value={typeDemande} onValueChange={setTypeDemande} required>
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12">
                        <SelectValue placeholder="Nature du document..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_DEMANDE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {typeDossier && selectedTypeObj && (
                  <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-5 mt-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <ShieldCheck className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Orientation Vers : {selectedTypeObj.target}</h4>
                      <p className="text-xs text-indigo-700/80 mt-1 font-medium leading-relaxed">
                        Le système notifiera instantanément les responsables de cette direction dès la validation de cet enregistrement.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-slate-100 mt-6">
                  <Label className="text-xs font-black uppercase tracking-tighter text-slate-500">Numérisation & Archivage (PDF)</Label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer",
                      scannedFile 
                        ? "border-emerald-400 bg-emerald-50/50" 
                        : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10"
                    )}
                  >
                    <div className={cn(
                      "h-16 w-16 rounded-2xl border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4",
                      scannedFile ? "bg-emerald-500 text-white border-emerald-400" : "bg-white text-indigo-500 border-slate-100"
                    )}>
                      {scannedFile ? <FileCheck className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                    </div>
                    <p className="text-sm text-slate-800 font-bold">
                      {scannedFile ? `Fichier prêt : ${scannedFile.name}` : "Cliquez pour parcourir ou glissez le fichier"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-widest italic">Format: PDF | Taille Max: 10MB</p>
                    <Button type="button" variant="outline" size="sm" className="mt-5 border-slate-300 font-bold px-6">
                      {scannedFile ? "Changer de fichier" : "Parcourir les fichiers"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button type="submit" disabled={isSubmitting || !typeDossier || !scannedFile} className="bg-slate-900 hover:bg-indigo-600 text-white gap-2 h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 transition-all">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Enregistrer & Transmettre (Temps Réel)
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-slate-500" />
                  Flux Récent (Archives)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingList ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                  </div>
                ) : recentDossiers.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-400 italic">
                    Aucun dossier réceptionné.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                            Dossier
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                            Entité
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {recentDossiers.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                  {d.numero_dossier}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {d.statut === 'approuve' ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0 h-4 text-[8px] font-black uppercase">Terminé</Badge>
                                  ) : d.statut === 'rejete' ? (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0 h-4 text-[8px] font-black uppercase">Rejeté</Badge>
                                  ) : (
                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-2 py-0 h-4 text-[8px] font-black uppercase tracking-widest">En cours</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-700 text-xs">
                              {(d as any).entite_nom || d.entreprises?.sigle || 'Non Défini'}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-between gap-2">
                                 <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "h-1.5 w-1.5 rounded-full animate-pulse",
                                    d.statut === 'recu' ? "bg-slate-400" :
                                    d.statut === 'numerise' ? "bg-amber-500" : "bg-emerald-500"
                                  )} />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    {d.statut?.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                {d.dossier_documents && d.dossier_documents.length > 0 && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(d.dossier_documents![0].url_pdf, '_blank');
                                    }}
                                    title="Voir le document"
                                  >
                                    <FileSearch className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 w-full"
                  onClick={() => navigate('/dossiers')}
                >
                  Journal Complet des Réceptions
                </Button>
              </CardFooter>
            </Card>

            <div className="p-6 rounded-2xl bg-indigo-900 text-white shadow-2xl shadow-indigo-900/40 relative overflow-hidden group">
               <div className="relative z-10">
                  <h3 className="font-black uppercase tracking-tighter text-lg leading-tight mb-2 italic">Aide à la numérisation</h3>
                  <p className="text-[11px] text-indigo-200 font-medium leading-relaxed mb-4">
                    Assurez-vous que les documents sont en haute résolution (300dpi) avant de les transmettre pour faciliter l'analyse technique.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest bg-white text-indigo-900 hover:bg-indigo-100 border-none"
                    onClick={() => navigate('/audit')}
                  >
                    Guide Interne
                  </Button>
               </div>
               <ShieldCheck className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 group-hover:scale-125 transition-transform duration-700" />
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardReception;
