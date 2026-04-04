import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Truck, Eye, Building2, Calendar, MapPin, Settings2, PackageCheck, Gavel } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface Order {
    id: string;
    created_at: string;
    carburant: string;
    quantite_demandee: number;
    priorite: string;
    statut: string;
    notes: string | null;
    entreprise_id: string | null;
    entreprise: { nom: string; sigle: string } | null;
    station: { nom: string; ville: string; statut: string; entreprise: { nom: string; sigle: string } | null } | null;
}

const statusColors: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    approuve: 'bg-blue-100 text-blue-800',
    en_cours: 'bg-purple-100 text-purple-800',
    livre: 'bg-green-100 text-green-800',
    annule: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const { role } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        fetchOrders();

        // Realtime subscription
        const channel = supabase
            .channel('public:ordres_livraison')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ordres_livraison' },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('ordres_livraison')
                .select(`
          *,
          entreprise:entreprises(nom, sigle),
          station:stations(nom, ville, statut, entreprise:entreprises(nom, sigle))
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders((data as unknown as Order[]) || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('ordres_livraison')
                .update({ statut: newStatus })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Statut mis à jour",
                description: `La commande est maintenant ${newStatus}`,
            });
            fetchOrders();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: error.message,
            });
        }
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.statut === filterStatus);

    // Retourne l'entreprise de la commande : directe (entreprise_id) OU via station
    const getEntreprise = (order: Order) =>
        order.entreprise || order.station?.entreprise || null;

    if (loading) {
        return (
            <DashboardLayout title="Gestion des Commandes" subtitle="SONAP">
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Gestion des Commandes" subtitle="SONAP">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Liste des Commandes ({filteredOrders.length})</CardTitle>
                    <div className="w-[200px]">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tout voir</SelectItem>
                                <SelectItem value="en_attente">En attente</SelectItem>
                                <SelectItem value="approuve">Approuvé</SelectItem>
                                <SelectItem value="en_cours">En cours</SelectItem>
                                <SelectItem value="livre">Livré</SelectItem>
                                <SelectItem value="annule">Annulé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Entreprise / Station</TableHead>
                                <TableHead>Carburant</TableHead>
                                <TableHead>Quantité</TableHead>
                                <TableHead>Priorité</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Aucune commande trouvée
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-primary">
                                                    {getEntreprise(order)?.nom || 'Entreprise inconnue'}
                                                    {getEntreprise(order)?.sigle && (
                                                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                                                            ({getEntreprise(order)!.sigle})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {order.station ? order.station.nom : 'Dépôt central'}
                                                </span>
                                                {order.station && order.station.statut === 'attente_validation' && (
                                                    <span className="text-[9px] font-black text-red-600 uppercase flex items-center gap-1 mt-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-fit">
                                                        <Gavel className="h-2.5 w-2.5" /> Bloqué (Conformité DJ/C)
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="capitalize">{order.carburant}</TableCell>
                                        <TableCell>{order.quantite_demandee.toLocaleString()} L</TableCell>
                                        <TableCell>
                                            {order.priorite === 'urgente' && <Badge variant="destructive">Urgente</Badge>}
                                            {order.priorite === 'haute' && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Haute</Badge>}
                                            {order.priorite === 'normale' && <Badge variant="outline">Normale</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.statut] || 'bg-gray-100'}`}>
                                                {order.statut?.replace('_', ' ') || 'Inconnu'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {/* Bouton Voir Détails */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                    title="Voir les détails"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>

                                                {/* Sélecteur de statut */}
                                                {(['admin_etat', 'super_admin', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'responsable_entreprise'].includes(role || '')) && (
                                                    <Select
                                                        value={order.statut}
                                                        onValueChange={(val) => updateStatus(order.id, val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-[130px] text-xs gap-1">
                                                            <Settings2 className="h-3.5 w-3.5 shrink-0" />
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="en_attente">
                                                                <span className="flex items-center gap-2">
                                                                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                                                                    En attente
                                                                </span>
                                                            </SelectItem>
                                                            <SelectItem value="approuve">
                                                                <span className="flex items-center gap-2">
                                                                    <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                                                                    Approuvé
                                                                </span>
                                                            </SelectItem>
                                                            <SelectItem value="en_cours">
                                                                <span className="flex items-center gap-2">
                                                                    <Truck className="h-3.5 w-3.5 text-purple-500" />
                                                                    En cours
                                                                </span>
                                                            </SelectItem>
                                                            <SelectItem value="annule">
                                                                <span className="flex items-center gap-2">
                                                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                                                    Annulé
                                                                </span>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Détails de la Commande</DialogTitle>
                        <DialogDescription>
                            Référence: #{selectedOrder?.id.slice(0, 8)}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Entreprise</Label>
                                    <div className="flex items-center gap-2 font-medium">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        {selectedOrder.station?.entreprise?.nom || 'N/A'} ({selectedOrder.station?.entreprise?.sigle})
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Destination</Label>
                                    <div className="flex items-center gap-2 font-medium">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {selectedOrder.station ? selectedOrder.station.nom : '🏢 Stock Central / Dépôt'}
                                        {selectedOrder.station && <span className="text-xs text-muted-foreground">({selectedOrder.station.ville})</span>}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Produit</Label>
                                    <div className="font-semibold text-lg capitalize">{selectedOrder.carburant}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Quantité Demandée</Label>
                                    <div className="font-semibold text-lg">{selectedOrder.quantite_demandee.toLocaleString()} L</div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Date de commande</Label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Priorité</Label>
                                    <div>
                                        {selectedOrder.priorite === 'urgente' && <Badge variant="destructive">Urgente</Badge>}
                                        {selectedOrder.priorite === 'haute' && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Haute</Badge>}
                                        {selectedOrder.priorite === 'normale' && <Badge variant="outline">Normale</Badge>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Statut Actuel</Label>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.statut] || 'bg-gray-100'}`}>
                                            {selectedOrder.statut?.replace('_', ' ') || 'Inconnu'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <>
                                    <Separator />
                                    <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                                        <Label className="text-muted-foreground text-xs">Notes / Instructions</Label>
                                        <p className="text-sm italic">"{selectedOrder.notes}"</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between">
                        <div className="flex-1">
                            {selectedOrder?.statut === 'en_attente' && (['admin_etat', 'super_admin', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'responsable_entreprise'].includes(role || '')) && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={selectedOrder?.station?.statut === 'attente_validation'}
                                        onClick={() => {
                                            if (selectedOrder) updateStatus(selectedOrder.id, 'approuve');
                                            setIsDetailsOpen(false);
                                        }}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" /> 
                                        {selectedOrder?.station?.statut === 'attente_validation' ? 'En attente de DJ/C' : 'Approuver'}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (selectedOrder) updateStatus(selectedOrder.id, 'annule');
                                            setIsDetailsOpen(false);
                                        }}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Refuser
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION RÉSUMÉ PAR STATUT                  */}
            {/* ═══════════════════════════════════════════ */}
            {!loading && orders.length > 0 && (
                <div className="mt-8 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-primary" />
                        Suivi des commandes par statut
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* En Attente */}
                        {(() => {
                            const items = orders.filter(o => o.statut === 'en_attente');
                            return (
                                <Card className="border-yellow-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-700">
                                            <Clock className="h-4 w-4" />
                                            En attente
                                            <Badge className="ml-auto bg-yellow-100 text-yellow-800 border-0">{items.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Aucune commande</p>
                                        ) : items.map(order => (
                                            <div key={order.id} className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-100">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-yellow-900">
                                                        {getEntreprise(order)?.nom || getEntreprise(order)?.sigle || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {order.carburant} &bull; {order.quantite_demandee.toLocaleString()} L
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(order.created_at), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Approuvé */}
                        {(() => {
                            const items = orders.filter(o => o.statut === 'approuve');
                            return (
                                <Card className="border-blue-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                                            <CheckCircle className="h-4 w-4" />
                                            Approuvé
                                            <Badge className="ml-auto bg-blue-100 text-blue-800 border-0">{items.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Aucune commande</p>
                                        ) : items.map(order => (
                                            <div key={order.id} className="flex items-center justify-between p-2 rounded-md bg-blue-50 border border-blue-100">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-blue-900">
                                                        {getEntreprise(order)?.nom || getEntreprise(order)?.sigle || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {order.carburant} &bull; {order.quantite_demandee.toLocaleString()} L
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(order.created_at), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* En Cours */}
                        {(() => {
                            const items = orders.filter(o => o.statut === 'en_cours');
                            return (
                                <Card className="border-purple-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-700">
                                            <Truck className="h-4 w-4" />
                                            En cours
                                            <Badge className="ml-auto bg-purple-100 text-purple-800 border-0">{items.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Aucune commande</p>
                                        ) : items.map(order => (
                                            <div key={order.id} className="flex items-center justify-between p-2 rounded-md bg-purple-50 border border-purple-100">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-purple-900">
                                                        {getEntreprise(order)?.nom || getEntreprise(order)?.sigle || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {order.carburant} &bull; {order.quantite_demandee.toLocaleString()} L
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(order.created_at), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Annulé */}
                        {(() => {
                            const items = orders.filter(o => o.statut === 'annule');
                            return (
                                <Card className="border-red-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                                            <XCircle className="h-4 w-4" />
                                            Annulé
                                            <Badge className="ml-auto bg-red-100 text-red-800 border-0">{items.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Aucune commande</p>
                                        ) : items.map(order => (
                                            <div key={order.id} className="flex items-center justify-between p-2 rounded-md bg-red-50 border border-red-100">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-red-900">
                                                        {getEntreprise(order)?.nom || getEntreprise(order)?.sigle || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {order.carburant} &bull; {order.quantite_demandee.toLocaleString()} L
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(order.created_at), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                    </div>
                </div>
            )}

        </DashboardLayout >
    );
}
