import { useEffect, useState, useCallback } from 'react';
import {
    FileText, Building2, CheckCircle2, Clock, Search,
    RefreshCw, FolderOpen, FileCheck, AlertCircle, Eye
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
}

export default function DashboardPersonnelAdmin() {
    const [entreprises, setEntreprises] = useState<EntrepriseDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('entreprises').select('*').order('nom');
            setEntreprises((data || []) as EntrepriseDoc[]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredEntreprises = entreprises.filter(e =>
        !searchQuery ||
        e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sigle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.numero_agrement.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusColor = (statut: string) => {
        if (statut === 'actif') return 'bg-emerald-100 text-emerald-700';
        if (statut === 'suspendu') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    };

    return (
        <DashboardLayout
            title="Espace Administratif"
            subtitle="Gestion des dossiers entreprises et suivi administratif"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">Dossiers Entreprises</h2>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Actualiser
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Entreprises" value={entreprises.length} subtitle="enregistrées" icon={Building2} />
                <StatCard title="Actives" value={entreprises.filter(e => e.statut === 'actif').length} subtitle="en activité" icon={CheckCircle2} variant="success" />
                <StatCard title="Suspendues" value={entreprises.filter(e => e.statut === 'suspendu').length} subtitle="en suspension" icon={Clock} variant={entreprises.filter(e => e.statut === 'suspendu').length > 0 ? 'warning' : 'default'} />
                <StatCard title="Fermées" value={entreprises.filter(e => e.statut === 'ferme').length} subtitle="arrêtées" icon={AlertCircle} />
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par nom, sigle ou numéro d'agrément..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Liste */}
            <div className="space-y-3">
                {filteredEntreprises.map(e => (
                    <Card key={e.id} className="hover:shadow-md transition-all">
                        <CardContent className="py-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold">{e.nom}</h3>
                                        <Badge variant="secondary" className="text-xs">{e.sigle}</Badge>
                                        <Badge className={statusColor(e.statut)} variant="secondary">{e.statut}</Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                        <span>Agrément: <span className="font-mono">{e.numero_agrement}</span></span>
                                        <span>Type: <span className="capitalize">{e.type}</span></span>
                                        <span>Région: {e.region}</span>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    {e.contact_nom && <p className="text-sm font-medium">{e.contact_nom}</p>}
                                    {e.contact_email && <p className="text-xs text-muted-foreground">{e.contact_email}</p>}
                                    {e.contact_telephone && <p className="text-xs text-muted-foreground">{e.contact_telephone}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredEntreprises.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Aucune entreprise trouvée</p>
                </div>
            )}
        </DashboardLayout>
    );
}
