import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Building2, CheckCircle2, Clock, Search,
    RefreshCw, FolderOpen, ClipboardCheck, AlertCircle, Eye,
    Users, MapPin, Calendar, Plus, Download, ChevronRight,
    UserPlus, Shield, Briefcase, Activity, Fuel
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notifyStationStatusUpdate } from '@/lib/notifications';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { format, subYears, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EntrepriseDoc {
    id: string;
    nom: string;
    sigle: string;
    type: string;
    numero_agrement: string;
    region: string;
    statut: string;
    contact_nom: string | null;
    contact_email: string | null;
    contact_telephone: string | null;
    created_at: string;
    documents_expires?: number;
}

interface Gestionnaire {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    entreprise_nom?: string;
    station_nom?: string;
}

interface DossierWorkflow {
    id: string;
    numero_dossier: string;
    entite_nom: string;
    type_demande: string;
    statut: string;
}

interface AdminAuditLog {
    id: string;
    action: string;
    target: string;
    created_at: string;
    user_name: string;
}

export default function DashboardAdministratif() {
    const { role, profile } = useAuth();
    const navigate = useNavigate();
    
    const [entreprises, setEntreprises] = useState<EntrepriseDoc[]>([]);
    const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
    const [dossiers, setDossiers] = useState<DossierWorkflow[]>([]);
    const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('dossiers');
    const [selectedEntreprise, setSelectedEntreprise] = useState<EntrepriseDoc | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const isAdminValidateur = ['directeur_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '');

    const handleDossierAction = async (dossierId: string, action: 'analyse' | 'valider' | 'rejeter') => {
        let nextStatut: string = '';
        if (action === 'analyse') nextStatut = 'en_analyse_admin';
        else if (action === 'valider') nextStatut = 'valide_admin';
        else if (action === 'rejeter') nextStatut = 'rejete_admin';

        try {
            const { error } = await (supabase as any)
                .from('dossiers_entreprise')
                .update({ statut: nextStatut })
                .eq('id', dossierId);

            if (error) throw error;

            toast.success(`Dossier mis à jour : ${nextStatut.replace(/_/g, ' ')}`);
            fetchData();
        } catch (error: any) {
            toast.error("Erreur lors de la mise à jour du dossier");
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Entreprises
            const { data: entData } = await supabase.from('entreprises').select('*').order('nom');
            
            // Logic: Document expires if created_at is older than 1 year (proxy for real expiry column)
            const oneYearAgo = subYears(new Date(), 1);
            const enrichedData = (entData || []).map(e => ({
                ...e,
                documents_expires: isBefore(new Date(e.created_at), oneYearAgo) ? 1 : 0
            }));
            setEntreprises(enrichedData as EntrepriseDoc[]);

            // Fetch Responsables (including Entreprise/Station links)
            const { data: gestData } = await supabase
                .from('profiles')
                .select(`
                    id, user_id, full_name, email, phone,
                    entreprise:entreprises(nom),
                    station:stations(nom)
                `)
                .or('entreprise_id.not.is.null,station_id.not.is.null');

            const formattedGest = (gestData || []).map((g: any) => ({
                id: g.id,
                full_name: g.full_name,
                email: g.email || 'N/A',
                phone: g.phone,
                entreprise_nom: g.entreprise?.nom,
                station_nom: g.station?.nom
            }));
            setGestionnaires(formattedGest);

            // Fetch Dossiers for workflow from dossiers_entreprise
            const { data: dossiersData } = await (supabase as any)
                .from('dossiers_entreprise')
                .select('id, numero_dossier, entite_nom, type_demande, statut')
                .in('statut', ['valide_tech', 'en_analyse_admin'])
                .order('updated_at', { ascending: false });
            setDossiers(dossiersData || []);

            // Fetch Real Audit Logs (proxying from a generic action table or filter)
            // If audit_logs table exists, use it. Otherwise, use an empty array.
            const { data: logsData } = await (supabase as any)
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (logsData) {
                setAuditLogs(logsData.map((l: any) => ({
                    id: l.id,
                    action: l.action,
                    target: l.target_id || 'Système',
                    created_at: l.created_at,
                    user_name: 'Utilisateur ' + l.user_id.substring(0, 5)
                })));
            }

        } catch (error) {
            console.error('Error fetching Administrative data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredEntreprises = useMemo(() => {
        return entreprises.filter(e =>
            !searchQuery ||
            e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.sigle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.numero_agrement.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [entreprises, searchQuery]);

    const statusColor = (statut: string) => {
        if (statut === 'actif') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (statut === 'suspendu') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const handleViewDetails = (entreprise: EntrepriseDoc) => {
        setSelectedEntreprise(entreprise);
        setIsDetailOpen(true);
    };

    const handleExportPDF = async () => {
        try {
            await generateCustomReportPDF({
                type: 'stock-national', 
                title: 'RÉPERTOIRE DES ENTREPRISES PÉTROLIÈRES - SIHG',
                data: {
                    stats_globales: {
                        total_stations: dossiers.length,
                        entreprises: entreprises.length,
                        conformite: Math.round((entreprises.filter(e => !e.documents_expires).length / Math.max(1, entreprises.length)) * 100)
                    },
                    entreprises: entreprises.map(e => ({
                        nom: e.nom,
                        sigle: e.sigle,
                        numero_agrement: e.numero_agrement,
                        statut: e.statut,
                        region: e.region
                    }))
                },
                signerRole: role || 'directeur_administratif',
                signerName: profile?.full_name || 'Direction Administrative'
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error("Erreur d'exportation PDF");
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Entreprise', 'Sigle', 'Type', 'Numéro Agrément', 'Région', 'Statut', 'Contact'];
            const data = entreprises.map(e => [
                e.nom,
                e.sigle || '-',
                e.type,
                e.numero_agrement,
                e.region,
                e.statut,
                e.contact_nom || '-'
            ]);

            await generateExcelReport({
                title: 'BASE DE DONNÉES ADMINISTRATIVE DES ENTREPRISES',
                filename: 'entreprises_sihg.xlsx',
                headers,
                data,
                signerRole: role || 'directeur_administratif',
                signerName: profile?.full_name || 'Direction Administrative'
            });
        } catch (error) {
            console.error('Excel Export Error:', error);
            toast.error("Erreur d'exportation Excel");
        }
    };

    return (
        <DashboardLayout
            title="Direction Administrative"
            subtitle="Gérer les aspects administratifs et réglementaires du secteur pétrolier"
        >
            <div className="flex items-center gap-1.5 mb-6">
                <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
            </div>

            <div className="mb-6 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-800 uppercase italic tracking-tight">Autorité de Gestion Administrative & Réglementaire</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Accès : Entreprises, Agréments, Licences et Documents Réglementaires.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatCard title="Entreprises Pétrolières" value={entreprises.length} subtitle={`${entreprises.filter(e => e.statut === 'actif').length} dossiers actifs`} icon={Building2} />
                <StatCard title="Dossiers en attente (DA)" value={dossiers.length} subtitle="Workflow Réglementaire" icon={Briefcase} variant={dossiers.length > 0 ? 'warning' : 'primary'} />
                <StatCard title="Responsables Agréés" value={gestionnaires.length} subtitle="Contacts officiels" icon={Users} />
            </div>

            <Tabs defaultValue="dossiers" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="dossiers" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <FolderOpen className="h-4 w-4" />
                            Entreprises
                        </TabsTrigger>
                        {isAdminValidateur && (
                            <TabsTrigger value="validation" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs flex gap-2">
                                <ClipboardCheck className="h-4 w-4" />
                                Workflow & Validations
                                <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-200 text-[10px] px-1 h-4">
                                    {dossiers.length}
                                </Badge>
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="gestionnaires" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Users className="h-4 w-4" />
                            Responsables
                        </TabsTrigger>
                        <TabsTrigger value="suivi" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Activity className="h-4 w-4" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        {['chef_service_administratif', 'directeur_administratif', 'super_admin'].includes(role || '') && (
                            <Button size="sm" className="gap-2 bg-slate-900 text-white font-bold h-9" onClick={() => navigate('/entreprises')}>
                                <Plus className="h-4 w-4" />
                                Nouvelle Entreprise
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-2 font-bold border-slate-200">
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2 font-bold border-slate-200">
                            <FileText className="h-3.5 w-3.5 text-red-600" />
                            PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0 h-9 w-9 p-0 border-slate-200">
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {isAdminValidateur && (
                    <TabsContent value="validation" className="space-y-4">
                        <Card className="border-none shadow-sm overflow-hidden">
                            <CardHeader className="bg-amber-50/50 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-amber-600" />
                                    Dossiers en attente de validation administrative (DA)
                                </CardTitle>
                                <Button className="bg-slate-900 text-white gap-2 font-bold shadow-sm" onClick={() => navigate('/dossiers')}>
                                    <FolderOpen className="h-4 w-4" />
                                    Ouvrir l'Espace Dossiers
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/20">
                                                <th className="text-left py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Numéro Dossier</th>
                                                <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Entité / Entreprise</th>
                                                <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Type Demande</th>
                                                <th className="text-right py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Statut Workflow</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {dossiers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center text-muted-foreground italic">Aucun dossier en attente (DA)</td>
                                                </tr>
                                            ) : (
                                                dossiers.map(d => (
                                                    <tr key={d.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/dossiers/${d.id}`)}>
                                                        <td className="py-4 px-6 font-bold">{d.numero_dossier}</td>
                                                        <td className="py-4 px-4">{d.entite_nom}</td>
                                                        <td className="py-4 px-4 font-black text-indigo-600 capitalize">{d.type_demande.replace(/_/g, ' ')}</td>
                                                         <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <Badge className={cn(
                                                                    "border-none font-black text-[10px] uppercase",
                                                                    d.statut === 'valide_tech' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                                                )}>
                                                                    {d.statut === 'valide_tech' ? 'Prêt pour DA' : 'En Analyse DA'}
                                                                </Badge>

                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {d.statut === 'valide_tech' && (
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Prendre en charge" onClick={(e) => { e.stopPropagation(); handleDossierAction(d.id, 'analyse'); }}>
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                    {d.statut === 'en_analyse_admin' && (
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Valider administrativement" onClick={(e) => { e.stopPropagation(); handleDossierAction(d.id, 'valider'); }}>
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Rejeter" onClick={(e) => { e.stopPropagation(); handleDossierAction(d.id, 'rejeter'); }}>
                                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="gestionnaires" className="space-y-4">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Responsables & Gestionnaires Référencés</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Nom Complet</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Organisation</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Installation</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {gestionnaires.length === 0 ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Aucun responsable identifié</td></tr>
                                        ) : (
                                            gestionnaires.map(g => (
                                                <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-6 font-bold">{g.full_name}</td>
                                                    <td className="py-4 px-4"><Badge variant="secondary">{g.entreprise_nom || 'Interne'}</Badge></td>
                                                    <td className="py-4 px-4 text-slate-600">{g.station_nom || 'Siège Social'}</td>
                                                    <td className="py-4 px-4 text-xs">{g.email}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dossiers" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <CardTitle className="text-lg">Registre des Entreprises Pétrolières</CardTitle>
                                <div className="relative w-full md:w-[350px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrer par nom, sigle ou agrément..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Entreprise</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Agrément</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Région</th>
                                            <th className="text-center py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Statut</th>
                                            <th className="text-right py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Détails</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredEntreprises.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-900">{e.nom}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">{e.sigle}</div>
                                                </td>
                                                <td className="py-4 px-4 font-mono text-[11px]">{e.numero_agrement}</td>
                                                <td className="py-4 px-4 font-medium">{e.region}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <Badge className={statusColor(e.statut)} variant="outline">{e.statut}</Badge>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(e)} className="h-8">
                                                        <Search className="h-3.5 w-3.5 mr-2" />
                                                        Fiche
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suivi">
                    <Card className="border-none shadow-sm">
                        <CardHeader><CardTitle className="text-lg">Historique Administratif (Audit)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auditLogs.length === 0 ? (
                                    <p className="text-center text-muted-foreground italic py-10">Aucun log récent</p>
                                ) : (
                                    auditLogs.map(log => (
                                        <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-primary"><Shield className="h-5 w-5" /></div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900">{log.action}</p>
                                                <p className="text-xs text-slate-500">{log.target} · <span className="font-bold">{log.user_name}</span> · {format(new Date(log.created_at), 'dd/MM HH:mm')}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedEntreprise && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">{selectedEntreprise.nom}</DialogTitle>
                                <DialogDescription>Information administrative détaillée</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                                    <p className="font-bold capitalize">{selectedEntreprise.type}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Agrément</Label>
                                    <p className="font-bold">{selectedEntreprise.numero_agrement}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Région</Label>
                                    <p className="font-bold">{selectedEntreprise.region}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Date Création</Label>
                                    <p className="font-bold">{format(new Date(selectedEntreprise.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Fermer</Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
