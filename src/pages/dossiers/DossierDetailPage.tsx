import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  FileText, Loader2, FileSearch, Building2, Calendar, Download,
  MapPin, Phone, FolderOpen, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ThumbsUp, ThumbsDown, HelpCircle
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateOfficialSONAPDocument } from '@/lib/officialDocuments';

const STATUT_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  recu: { label: 'Reçu (Reception)', color: 'bg-slate-100 text-slate-700', step: 1 },
  numerise: { label: 'Numérisé', color: 'bg-indigo-100 text-indigo-700', step: 2 },
  en_analyse_tech: { label: 'Analyse Technique (DSA)', color: 'bg-amber-100 text-amber-700', step: 3 },
  valide_tech: { label: 'Validé (Technique)', color: 'bg-emerald-100 text-emerald-700', step: 4 },
  en_analyse_admin: { label: 'Analyse Admin (DA)', color: 'bg-amber-100 text-amber-700', step: 5 },
  valide_admin: { label: 'Validé (Admin)', color: 'bg-emerald-100 text-emerald-700', step: 6 },
  en_analyse_jur: { label: 'Analyse Juridique (DJ)', color: 'bg-amber-100 text-amber-700', step: 7 },
  valide_jur: { label: 'Validé (Juridique)', color: 'bg-emerald-100 text-emerald-700', step: 8 },
  avis_dg: { label: 'Avis DG Rendu', color: 'bg-purple-100 text-purple-700', step: 9 },
  approuve: { label: 'APPROUVÉ (ÉTAT)', color: 'bg-emerald-600 text-white', step: 10 },
  rejete: { label: 'REJETÉ', color: 'bg-red-600 text-white', step: 10 },
};

const WORKFLOW_STEPS = [
  { key: 'recu', label: 'Réception' },
  { key: 'numerise', label: 'Numérisation' },
  { key: 'valide_tech', label: 'DSA (Technique)' },
  { key: 'valide_admin', label: 'DA (Admin)' },
  { key: 'valide_jur', label: 'DJ (Juridique)' },
  { key: 'avis_dg', label: 'DG (Avis)' },
  { key: 'approuve', label: 'État (Final)' },
];

export default function DossierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [dossier, setDossier] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [observation, setObservation] = useState('');
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [avisType, setAvisType] = useState<string>(''); // Favorable, Défavorable, Réservé

  const fetchDossierDetails = async () => {
    try {
      setLoading(true);
      const { data: dData, error: dError } = await (supabase as any)
        .from('dossiers_entreprise')
        .select(`*, entreprises (*)`)
        .eq('id', id as string)
        .single();
      if (dError) throw dError;
      setDossier(dData);

      const { data: docs } = await (supabase as any)
        .from('dossier_documents')
        .select('*')
        .eq('dossier_id', id as string);
      setDocuments(docs || []);
      if (docs && docs.length > 0) setSelectedPdf(docs[0].url_pdf);

      const { data: hist } = await (supabase as any)
        .from('dossier_historique')
        .select(`*, profiles:acteur_id (prenom, nom)`)
        .eq('dossier_id', id as string)
        .order('created_at', { ascending: false });
      setHistorique(hist || []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les détails du dossier.");
      navigate('/dossiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDossierDetails();
  }, [id]);

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW ROLE LOGIC — "La DG analyse… mais l'État tranche."
  // ═══════════════════════════════════════════════════════════
  const canAct = useMemo(() => {
    if (!dossier || !role) return { allow: false, roleContext: null as string | null };
    const st = dossier.statut;
    const isSuper = role === 'super_admin';

    // Agent Courrier
    if (st === 'recu' && (role === 'agent_reception' || isSuper)) return { allow: true, roleContext: 'COURRIER' };
    
    // DSA (Tech)
    if ((st === 'numerise' || st === 'en_analyse_tech') && (['directeur_aval', 'chef_service_aval', 'agent_technique_aval'].includes(role) || isSuper)) return { allow: true, roleContext: 'DSA' };
    
    // DA (Admin)
    if ((st === 'valide_tech' || st === 'en_analyse_admin') && (['directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire'].includes(role) || isSuper)) return { allow: true, roleContext: 'DA' };

    // DJ (Juridique)
    if ((st === 'valide_admin' || st === 'en_analyse_jur') && (['directeur_juridique', 'juriste', 'charge_conformite'].includes(role) || isSuper)) return { allow: true, roleContext: 'DJ' };

    // Secrétaire Général — Prépare et vérifie avant le DG, puis transmet à l'État après avis DG
    if (st === 'valide_jur' && (role === 'secretariat_direction' || isSuper)) return { allow: true, roleContext: 'SG_PREP' };
    
    // Check if it was already transmitted
    const hasBeenTransmitted = historique.some(h => h.action === 'SG_TRANSMIT');
    if (st === 'avis_dg' && !hasBeenTransmitted && role === 'secretariat_direction') return { allow: true, roleContext: 'SG_TRANSMIT' };

    // DG / DGA (Avis stratégique — pas de validation finale)
    if (st === 'valide_jur' && (['directeur_general', 'directeur_adjoint'].includes(role) || isSuper)) return { allow: true, roleContext: 'DG' };

    // ETAT (Admin Central — Décision Finale)
    if (st === 'avis_dg' && (role === 'admin_central' || isSuper)) return { allow: true, roleContext: 'ETAT' };

    return { allow: false, roleContext: null };
  }, [dossier, role]);

  // ═══════════════════════════════════════════════════════════
  // ACTION HANDLER — Gère toutes les actions du workflow
  // ═══════════════════════════════════════════════════════════
  const handleAction = async (actionType: string) => {
    if (!observation && actionType === 'REJETER') {
      toast.error("Vous devez fournir une observation pour rejeter un dossier.");
      return;
    }
    if (actionType === 'AVIS_DG' && !avisType) {
      toast.error("Veuillez sélectionner un type d'avis : Favorable, Défavorable ou Réservé.");
      return;
    }
    if (actionType === 'AVIS_DG' && !observation) {
      toast.error("Veuillez rédiger votre avis stratégique avant de soumettre.");
      return;
    }
    
    setProcessing(true);
    let nouveau_statut = dossier.statut;
    const ctx = canAct.roleContext;

    try {
      if (actionType === 'REJETER') {
        nouveau_statut = 'rejete';
      } else if (actionType === 'VALIDER') {
        if (ctx === 'COURRIER') nouveau_statut = 'numerise';
        else if (ctx === 'DSA') nouveau_statut = 'valide_tech';
        else if (ctx === 'DA') nouveau_statut = 'valide_admin';
        else if (ctx === 'DJ') nouveau_statut = 'valide_jur';
        else if (ctx === 'ETAT') nouveau_statut = 'approuve';
      } else if (actionType === 'AVIS_DG') {
        nouveau_statut = 'avis_dg';
      } else if (actionType === 'SG_TRANSMIT') {
        // SG transmits to État — status stays 'avis_dg' (ready for Admin Central)
        nouveau_statut = 'avis_dg'; // The status remains, but an explicit history entry records the transmission
      } else if (actionType === 'SG_PREP') {
        // SG marks dossier as ready for DG — no status change, just historique entry
        nouveau_statut = dossier.statut;
      }

      // Update status if changed
      if (dossier.statut !== nouveau_statut) {
        const { error: updErr } = await (supabase as any)
          .from('dossiers_entreprise')
          .update({ statut: nouveau_statut })
          .eq('id', id as string);
        if (updErr) throw updErr;
      }

      // Build the observation text for DG avis
      const finalObs = actionType === 'AVIS_DG' 
        ? `[Avis ${avisType}] ${observation}`
        : actionType === 'SG_TRANSMIT'
        ? `[TRANSMISSION ÉTAT] ${observation || 'Dossier conforme, transmis à l\'Administrateur Central pour décision finale.'}`
        : observation || null;

      // Record History
      const { error: histErr } = await (supabase as any)
        .from('dossier_historique')
        .insert({
          dossier_id: id,
          action: actionType,
          statut_precedent: dossier.statut,
          nouveau_statut: nouveau_statut,
          acteur_id: user?.id,
          observation: finalObs
        });
      if (histErr) throw histErr;

      const successMessages: Record<string, string> = {
        'VALIDER': 'Étape validée avec succès !',
        'REJETER': 'Dossier rejeté.',
        'AVIS_DG': `Avis ${avisType} de la Direction Générale enregistré.`,
        'SG_TRANSMIT': 'Dossier TRANSMIS à l\'Administrateur Central (État).',
        'SG_PREP': 'Dossier préparé pour la Direction Générale.',
      };
      toast.success(successMessages[actionType] || 'Action enregistrée.');
      setObservation('');
      setAvisType('');
      fetchDossierDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'action.");
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateOfficialDoc = async () => {
    if (!dossier) return;
    try {
      setProcessing(true);
      toast.info("Génération de l'acte officiel en cours...");
      
      // Determine document type based on dossier type/content
      const docType = dossier.type_dossier?.toLowerCase().includes('licence') ? 'licence' : 
                      dossier.type_dossier?.toLowerCase().includes('conformite') ? 'conformite' : 'autorisation';

      await generateOfficialSONAPDocument({
        type: docType as any,
        numero: dossier.numero_dossier,
        entite: dossier.entite_nom || dossier.entreprises?.nom || 'Entité SIHG',
        adresse: dossier.entreprises?.adresse,
        region: dossier.entreprises?.region,
        signatureRole: 'Directeur Général',
        details: {
          'Identifiant Fiscal': dossier.entreprises?.nif || 'N/A',
          'Référence Dossier': dossier.numero_dossier,
          'Date d\'Approbation': new Date(dossier.updated_at).toLocaleDateString('fr-FR'),
          'Statut Qualité': 'Vérifié & Certifié'
        }
      });
      toast.success("Document officiel généré avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de la génération : " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <DashboardLayout title="Chargement"><div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-slate-400"/></div></DashboardLayout>;
  }
  if (!dossier) return <DashboardLayout title="Dossier Introuvable"><div className="p-10 text-center">Dossier introuvable.</div></DashboardLayout>;

  const currentStep = STATUT_CONFIG[dossier.statut]?.step || 0;

  return (
    <DashboardLayout 
      title={`Dossier ${dossier.numero_dossier}`} 
      subtitle="Examen continu, traçabilité complète et validation formelle."
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/dossiers')} className="gap-2 bg-white">
          <ArrowLeft className="h-4 w-4" /> Retour au Registre
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="hidden md:flex items-center gap-1 mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        {WORKFLOW_STEPS.map((step, i) => {
          const stepNum = STATUT_CONFIG[step.key]?.step || i + 1;
          const isActive = currentStep >= stepNum;
          const isCurrent = dossier.statut === step.key || 
            (step.key === 'valide_tech' && ['en_analyse_tech', 'valide_tech'].includes(dossier.statut)) ||
            (step.key === 'valide_admin' && ['en_analyse_admin', 'valide_admin'].includes(dossier.statut)) ||
            (step.key === 'valide_jur' && ['en_analyse_jur', 'valide_jur'].includes(dossier.statut));
          return (
            <React.Fragment key={step.key}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-50 text-slate-400'} ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
                {step.label}
              </div>
              {i < WORKFLOW_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${isActive ? 'bg-indigo-400' : 'bg-slate-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL GAUCHE : INFOS + HISTORIQUE */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-none shadow-md overflow-hidden">
            <div className={`h-2 ${dossier.statut === 'approuve' ? 'bg-emerald-500' : dossier.statut === 'rejete' ? 'bg-red-500' : 'bg-indigo-500'}`} />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Badge className={STATUT_CONFIG[dossier.statut]?.color || 'bg-slate-200 text-slate-700'}>
                  {STATUT_CONFIG[dossier.statut]?.label}
                </Badge>
                <div className="text-xs font-mono font-bold text-slate-500">{dossier.numero_dossier}</div>
              </div>
              <h3 className="font-black text-xl mb-1 text-slate-800">
                {dossier.entite_nom || dossier.entreprises?.nom || 'Inconnu'} 
                {dossier.entreprises?.sigle ? ` (${dossier.entreprises?.sigle})` : ''}
              </h3>
              <p className="text-sm font-medium text-slate-500 mb-6 flex items-center gap-1">
                <FolderOpen className="h-4 w-4" /> Type : {dossier.type_dossier}
              </p>
              
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{dossier.entreprises?.adresse || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{dossier.entreprises?.telephone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">Déposé le : {new Date(dossier.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-none shadow-md">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-md flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Traçabilité (Workflow)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {historique.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6 italic">Aucune action enregistrée.</p>
                ) : (
                  historique.map((h) => (
                    <div key={h.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold 
                          ${h.action === 'VALIDER' ? 'border-emerald-200 text-emerald-600' : 
                          h.action === 'REJETER' ? 'border-red-200 text-red-600' :
                          h.action === 'AVIS_DG' ? 'border-purple-200 text-purple-600' :
                          h.action === 'SG_TRANSMIT' ? 'border-blue-200 text-blue-600' :
                          'border-indigo-200 text-indigo-600'}`}>
                          {h.action === 'AVIS_DG' ? '📝 AVIS DG' : h.action === 'SG_TRANSMIT' ? '📤 TRANSMIS ÉTAT' : h.action}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-2">{STATUT_CONFIG[h.nouveau_statut]?.label || h.nouveau_statut}</p>
                      {h.observation && (
                        <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">"{h.observation}"</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2 text-right">par {h.profiles?.prenom} {h.profiles?.nom}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COL DROITE : ACTIONS + PDF VIEWER */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
          
          {/* ═══ ACTION ZONES (Conditional by Role) ═══ */}

          {/* Standard Direction Actions (DSA, DA, DJ, Courrier, État) */}
          {canAct.allow && ['COURRIER', 'DSA', 'DA', 'DJ', 'ETAT'].includes(canAct.roleContext || '') && dossier.statut !== 'approuve' && dossier.statut !== 'rejete' && (
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-md">
              <CardContent className="p-4">
                <h4 className="font-bold text-emerald-900 text-sm mb-3">
                  Zone de Décision — {canAct.roleContext}
                </h4>
                <Textarea 
                  placeholder="Observations, remarques techniques ou administratives... (Requis en cas de rejet)"
                  value={observation} onChange={(e) => setObservation(e.target.value)}
                  className="bg-white border-emerald-100 focus-visible:ring-emerald-500 min-h-[80px] mb-3"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => handleAction('VALIDER')} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {canAct.roleContext === 'ETAT' ? 'APPROUVER DÉFINITIVEMENT' : 'VALIDER L\'ÉTAPE'}
                  </Button>
                  <Button onClick={() => handleAction('REJETER')} disabled={processing} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" /> REJETER
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Direction Générale — Avis Stratégique (DG / DGA) ═══ */}
          {canAct.allow && canAct.roleContext === 'DG' && dossier.statut !== 'approuve' && dossier.statut !== 'rejete' && (
            <Card className="border-purple-200 bg-purple-50/50 shadow-md">
              <CardContent className="p-5">
                <h4 className="font-bold text-purple-900 text-sm mb-1 flex items-center gap-2">
                  📋 Avis de la Direction Générale
                </h4>
                <p className="text-xs text-purple-600 mb-4">"La DG analyse… mais l'État tranche."</p>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Type d'Avis</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'FAVORABLE', icon: ThumbsUp, color: 'emerald', label: 'Favorable' },
                      { value: 'DÉFAVORABLE', icon: ThumbsDown, color: 'red', label: 'Défavorable' },
                      { value: 'RÉSERVÉ', icon: HelpCircle, color: 'amber', label: 'Réservé' },
                    ].map(opt => (
                      <button 
                        key={opt.value}
                        type="button"
                        onClick={() => setAvisType(opt.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          avisType === opt.value 
                            ? `border-${opt.color}-500 bg-${opt.color}-50 ring-2 ring-${opt.color}-300` 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <opt.icon className={`h-6 w-6 mx-auto mb-1 ${avisType === opt.value ? `text-${opt.color}-600` : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${avisType === opt.value ? `text-${opt.color}-800` : 'text-slate-500'}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea 
                  placeholder="Rédigez votre avis stratégique (obligatoire)..."
                  value={observation} onChange={(e) => setObservation(e.target.value)}
                  className="bg-white border-purple-100 focus-visible:ring-purple-500 min-h-[100px] mb-4"
                />
                <Button onClick={() => handleAction('AVIS_DG')} disabled={processing || !avisType || !observation} className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  SOUMETTRE L'AVIS ({avisType || '...'})
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══ Secrétaire Général — Préparation Dossier pour DG ═══ */}
          {canAct.allow && canAct.roleContext === 'SG_PREP' && dossier.statut !== 'approuve' && dossier.statut !== 'rejete' && (
            <Card className="border-blue-200 bg-blue-50/50 shadow-md">
              <CardContent className="p-5">
                <h4 className="font-bold text-blue-900 text-sm mb-1 flex items-center gap-2">
                  📂 Préparation pour la Direction Générale
                </h4>
                <p className="text-xs text-blue-600 mb-4">Vérifiez que toutes les validations (DSA, DA, DJ) sont complètes avant de soumettre au DG.</p>
                <Textarea 
                  placeholder="Notes de préparation (optionnel)..."
                  value={observation} onChange={(e) => setObservation(e.target.value)}
                  className="bg-white border-blue-100 focus-visible:ring-blue-500 min-h-[60px] mb-3"
                />
                <Button onClick={() => handleAction('SG_PREP')} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  MARQUER COMME PRÊT POUR LE DG
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══ Secrétaire Général — Transmission à l'État ═══ */}
          {canAct.allow && canAct.roleContext === 'SG_TRANSMIT' && dossier.statut !== 'approuve' && dossier.statut !== 'rejete' && (
            <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md">
              <CardContent className="p-5">
                <h4 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-2">
                  📤 Transmission à l'Administrateur Central (ÉTAT)
                </h4>
                <p className="text-xs text-amber-700 mb-4">L'avis de la DG a été rendu. Vous pouvez maintenant transmettre officiellement ce dossier à l'État pour décision finale.</p>
                <Textarea 
                  placeholder="Note de transmission (optionnel, ex: priorité haute)..."
                  value={observation} onChange={(e) => setObservation(e.target.value)}
                  className="bg-white border-amber-200 focus-visible:ring-amber-500 min-h-[60px] mb-3"
                />
                <Button onClick={() => handleAction('SG_TRANSMIT')} disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white w-full shadow-lg shadow-amber-600/20">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  TRANSMETTRE À LA RÉGULATION (ÉTAT DE GUINÉE)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status if not allowed */}
          {(!canAct.allow || dossier.statut === 'approuve' || dossier.statut === 'rejete') && (
             <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium
              ${dossier.statut === 'approuve' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                dossier.statut === 'rejete' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-slate-50 text-slate-500 border-slate-200'}
             `}>
               {dossier.statut === 'approuve' ? <CheckCircle2 className="h-5 w-5" /> : 
                dossier.statut === 'rejete' ? <XCircle className="h-5 w-5" /> : 
                <AlertTriangle className="h-5 w-5" />}
               {dossier.statut === 'approuve' ? "Dossier officiellement validé et clôturé par l'État de Guinée." : 
                dossier.statut === 'rejete' ? "Dossier clôturé et rejeté définitivement." : 
                "Vous n'êtes pas l'acteur habilité à agir sur ce dossier actuellement. Consultation en lecture seule."}
             </div>
          )}

          {/* Official Document Generation Button for Approved Dossiers */}
          {dossier.statut === 'approuve' && (
            <Card className="border-emerald-500 bg-emerald-600 text-white shadow-xl shadow-emerald-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ShieldCheck className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">ACTE OFFICIEL DISPONIBLE</h3>
                    <p className="text-emerald-100 text-sm font-medium">Ce dossier a été approuvé par la Direction Générale et l'État.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerateOfficialDoc} 
                  disabled={processing}
                  className="bg-white text-emerald-700 hover:bg-slate-50 font-black px-8 py-6 rounded-2xl gap-3 shadow-lg"
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  TÉLÉCHARGER L'ACTE OFFICIEL (PDF)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* PDF Viewer */}
          <Card className="border-none shadow-md flex-1 min-h-[600px] flex flex-col">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl px-4 py-3 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-indigo-400" /> Visionneuse PDF Intégrée
                </CardTitle>
                {selectedPdf && (
                  <a href={selectedPdf} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800 gap-1 text-xs">
                      <Download className="h-3 w-3" /> Télécharger
                    </Button>
                  </a>
                )}
              </div>
            </CardHeader>
            <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
              {documents.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Aucun document attaché</span>
              ) : (
                documents.map((doc: any) => (
                  <Button 
                    key={doc.id}
                    variant={selectedPdf === doc.url_pdf ? "default" : "outline"}
                    size="sm"
                    className={`text-[10px] uppercase font-bold px-3 h-7 ${selectedPdf === doc.url_pdf ? 'bg-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                    onClick={() => setSelectedPdf(doc.url_pdf)}
                  >
                    {doc.nom_fichier || doc.type_document}
                  </Button>
                ))
              )}
            </div>
            <CardContent className="p-0 flex-1 relative bg-slate-50">
              {selectedPdf ? (
                <iframe 
                  src={`${selectedPdf}#toolbar=0`} 
                  className="w-full h-full absolute inset-0 border-0 rounded-b-xl"
                  title="PDF Viewer"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <FileText className="h-16 w-16 mb-4 opacity-20" />
                  <p>Aucun document sélectionné pour la visualisation</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}
