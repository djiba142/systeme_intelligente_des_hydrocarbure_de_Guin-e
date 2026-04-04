import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Plus, Search, Filter, Loader2, Eye, Building2, Calendar, FolderOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  recu: { label: 'Reçu (Reception)', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  numerise: { label: 'Numérisé', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  en_analyse_tech: { label: 'Analyse Technique (DSA)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  valide_tech: { label: 'Validé (Technique)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  en_analyse_admin: { label: 'Analyse Admin (DA)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  valide_admin: { label: 'Validé (Admin)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  en_analyse_jur: { label: 'Analyse Juridique (DJ)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  valide_jur: { label: 'Validé (Juridique)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  avis_dg: { label: 'Avis DG Rendu', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  approuve: { label: 'APPROUVÉ (ÉTAT)', color: 'bg-emerald-600 text-white' },
  rejete: { label: 'REJETÉ', color: 'bg-red-600 text-white' },
};

export default function DossiersListPage() {
  const { user, role } = useAuth();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const canCreate = role === 'agent_reception' || role === 'super_admin';

  const getVisibleStatuses = (userRole: string | undefined | null) => {
    if (!userRole) return [];
    if (['super_admin', 'agent_reception', 'secretariat_direction'].includes(userRole)) return null; 
    
    if (['directeur_aval', 'chef_service_aval', 'agent_technique_aval'].includes(userRole)) {
      return ['numerise', 'en_analyse_tech', 'valide_tech', 'en_analyse_admin', 'valide_admin', 'en_analyse_jur', 'valide_jur', 'avis_dg', 'approuve', 'rejete'];
    }
    if (['directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire'].includes(userRole)) {
      return ['valide_tech', 'en_analyse_admin', 'valide_admin', 'en_analyse_jur', 'valide_jur', 'avis_dg', 'approuve', 'rejete'];
    }
    if (['directeur_juridique', 'juriste', 'charge_conformite'].includes(userRole)) {
      return ['valide_admin', 'en_analyse_jur', 'valide_jur', 'avis_dg', 'approuve', 'rejete'];
    }
    if (['directeur_general', 'directeur_adjoint'].includes(userRole)) {
      return ['valide_jur', 'avis_dg', 'approuve', 'rejete'];
    }
    if (['admin_central', 'admin_etat'].includes(userRole)) {
      return ['avis_dg', 'approuve', 'rejete'];
    }
    
    return null; 
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('dossiers_entreprise')
        .select(`
          *,
          entreprises (nom, sigle)
        `)
        .order('created_at', { ascending: false });

      const allowedStatuses = getVisibleStatuses(role);
      if (allowedStatuses) {
        query = query.in('statut', allowedStatuses);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "dossiers_entreprise" does not exist')) {
          setDossiers([]);
          return;
        }
        throw error;
      }
      
      setDossiers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors du chargement des dossiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public:dossiers_entreprise')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_entreprise' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return dossiers.filter(d => {
      const matchSearch = 
        d.numero_dossier.toLowerCase().includes(search.toLowerCase()) || 
        (d.entreprises?.nom || '').toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === 'all' || d.statut === filterStatut;
      const matchType = filterType === 'all' || d.type_dossier === filterType;
      return matchSearch && matchStatut && matchType;
    });
  }, [dossiers, search, filterStatut, filterType]);

  const stats = useMemo(() => ({
    total: dossiers.length,
    en_attente: dossiers.filter(d => d.statut !== 'approuve' && d.statut !== 'rejete').length,
    approuves: dossiers.filter(d => d.statut === 'approuve').length,
    rejetes: dossiers.filter(d => d.statut === 'rejete').length,
  }), [dossiers]);

  return (
    <DashboardLayout title="Gestion des Dossiers" subtitle="Registre central de tous les dossiers d'entreprises et leur cycle de vie">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Dossiers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-amber-600 animate-[spin_3s_linear_infinite]" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{stats.en_attente}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">En Cours de Traitement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{stats.approuves}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Approuvés (État)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{stats.rejetes}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Rejetés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par N° dossier ou Entreprise..." 
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-slate-50">
            <SelectValue placeholder="Type de dossier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="Agrément">Agréments</SelectItem>
            <SelectItem value="Licence">Licences</SelectItem>
            <SelectItem value="Importation">Importations</SelectItem>
            <SelectItem value="Autre">Autres</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[200px] bg-slate-50">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.keys(STATUT_CONFIG).map(key => (
              <SelectItem key={key} value={key}>{STATUT_CONFIG[key].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {canCreate && (
          <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto">
            <Link to="/dossiers/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau Dossier
            </Link>
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-200">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-700">Aucun dossier trouvé</h3>
            <p className="text-sm text-slate-500">Ajoutez un dossier ou modifiez vos filtres.</p>
          </div>
        ) : (
          filtered.map((d) => {
            const config = STATUT_CONFIG[d.statut] || { label: d.statut, color: 'bg-slate-100 text-slate-800' };
            return (
              <Link key={d.id} to={`/dossiers/${d.id}`}>
                <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                    
                    <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
                      <FolderOpen className="h-6 w-6 text-indigo-400 group-hover:text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {d.numero_dossier}
                        </span>
                        <h4 className="font-bold text-slate-900">{d.entreprises?.nom || 'Entreprise Inconnue'}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {d.type_dossier}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto mt-3 md:mt-0 justify-between md:justify-end">
                      <Badge className={`text-[10px] uppercase font-bold border ${config.color}`}>
                        {config.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-indigo-600 shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>

    </DashboardLayout>
  );
}
