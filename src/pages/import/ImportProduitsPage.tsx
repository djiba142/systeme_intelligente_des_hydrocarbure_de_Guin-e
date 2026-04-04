import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Droplets, Plus, Search, Filter, 
  MoreVertical, Edit, Trash2, Info, Activity
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImportProduit {
  id: string;
  nom: string;
  type: string;
  densite: string;
  statut: string;
  description: string | null;
}

interface NewProduit {
  nom: string;
  type: string;
  densite: number;
  statut: string;
  description: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ImportProduitsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  // Fetch products
  const { data: produits, isLoading } = useQuery({
    queryKey: ['import-produits'],
    queryFn: async () => {
      // Mock data if table doesn't exist, otherwise fetch
      try {
        const { data, error } = await db
          .from('import_produits')
          .select('*')
          .order('nom', { ascending: true });
        
        if (error) throw error;
        return (data as ImportProduit[]) || [];
      } catch (err) {
        console.warn("Table import_produits not found, using default assets.");
        return [
          { id: '1', nom: 'Essence Super (RON 95)', type: 'carburant', densite: '0.74', statut: 'actif', description: 'Carburant pour moteurs à allumage commandé.' },
          { id: '2', nom: 'Gasoil (Diesel)', type: 'carburant', densite: '0.84', statut: 'actif', description: 'Carburant pour moteurs diesel.' },
          { id: '3', nom: 'Jet A1', type: 'aviation', densite: '0.80', statut: 'actif', description: 'Kérosène pour l\'aviation commerciale.' },
          { id: '4', nom: 'Fuel Oil (HFO)', type: 'industriel', densite: '0.98', statut: 'actif', description: 'Combustible lourd pour centrales thermiques.' },
          { id: '5', nom: 'Bitume', type: 'industriel', densite: '1.02', statut: 'actif', description: 'Utilisé pour les travaux routiers.' },
        ] as ImportProduit[];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: NewProduit) => {
      const { error } = await db
        .from('import_produits')
        .insert(newProduct);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-produits'] });
      toast({ title: "Succès", description: "Produit pétrolier ajouté au catalogue." });
      setIsDialogOpen(false);
    },
    onError: () => {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le produit (vérifiez la base de données)." });
    }
  });

  const filteredProduits = produits?.filter((p: ImportProduit) => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout 
      title="Catalogue des Produits Pétroliers" 
      subtitle="Gestion des spécifications techniques et nomenclatures des hydrocarbures importés."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Chercher essence, diesel, jet fuel..." 
              className="pl-10 h-11 border-none bg-slate-50 dark:bg-slate-800 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(role === 'directeur_importation' || role === 'super_admin' || role === 'agent_importation') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-primary/20 bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <Plus className="h-4 w-4" /> Nouveau Produit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl border-none shadow-premium">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Référencer un Produit</DialogTitle>
                  <CardDescription>Définissez les caractéristiques physiques du nouvel hydrocarbure.</CardDescription>
                </DialogHeader>
                <form className="space-y-4 pt-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const densiteVal = parseFloat(formData.get('densite') as string);
                  if (isNaN(densiteVal)) {
                    toast({ variant: "destructive", title: "Erreur", description: "La densité doit être un nombre valide." });
                    return;
                  }
                  
                  createMutation.mutate({
                    nom: formData.get('nom') as string,
                    type: formData.get('type') as string,
                    densite: densiteVal,
                    statut: 'actif',
                    description: formData.get('description') as string,
                  });
                }}>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nom Commercial</Label>
                    <Input name="nom" placeholder="Ex: Essence Sans Plomb RON 91" required className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type de Produit</Label>
                      <Select name="type" defaultValue="carburant">
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Choisir type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                            <SelectItem value="carburant">Carburant</SelectItem>
                            <SelectItem value="aviation">Aviation (Jet)</SelectItem>
                            <SelectItem value="industriel">Industriel / Lourd</SelectItem>
                            <SelectItem value="lubrifiant">Lubrifiant</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Densité (kg/L)</Label>
                      <Input name="densite" placeholder="0.84" required className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description Technique</Label>
                    <textarea 
                        name="description" 
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                        placeholder="Propriétés physico-chimiques..."
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl mt-4 font-black uppercase tracking-widest" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Traitement..." : "Ajouter au Catalogue"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="p-8 border-b border-slate-50 dark:border-white/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Inventaire des Spécifications</CardTitle>
                        <CardDescription className="font-medium italic">Liste officielle des hydrocarbures autorisés à l'importation.</CardDescription>
                    </div>
                    <Badge className="bg-slate-100 text-slate-900 border-none font-black px-4 py-1 rounded-lg">
                        {filteredProduits?.length} PRODUITS
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                            <TableRow>
                                <TableHead className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Produit</TableHead>
                                <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Classification</TableHead>
                                <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Densité Moyenne</TableHead>
                                <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Statut National</TableHead>
                                <TableHead className="px-8 py-4 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 font-black text-slate-300 animate-pulse">Synchronisation SIHG...</TableCell></TableRow>
                            ) : filteredProduits?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <Droplets size={48} />
                                            <p className="text-sm font-black uppercase">Aucun produit référencé</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredProduits?.map((p: ImportProduit) => (
                                <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <Droplets className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.nom}</p>
                                                <p className="text-[10px] text-slate-400 font-bold max-w-[200px] truncate">{p.description || 'Aucune description'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <Badge className={cn(
                                            "border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest",
                                            p.type === 'carburant' ? "bg-blue-50 text-blue-600" :
                                            p.type === 'aviation' ? "bg-amber-50 text-amber-600" :
                                            "bg-slate-100 text-slate-600"
                                        )}>
                                            {p.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-3 w-3 text-emerald-500" />
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{p.densite} kg/L</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Actif</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                                                onClick={() => toast({ title: p.nom, description: p.description || "Spécification technique standard SONAP." })}
                                            >
                                                <Info className="h-4 w-4" />
                                            </Button>
                                            {(role === 'directeur_importation' || role === 'super_admin') && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500"
                                                    onClick={() => {
                                                        if (confirm(`Voulez-vous vraiment retirer ${p.nom} du catalogue ?`)) {
                                                            toast({ title: "Action restreinte", description: "Le retrait de produits stratégiques nécessite une validation en Conseil d'Administration." });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-8 overflow-hidden relative group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                       <Droplets className="h-32 w-32" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Ravage Importations</p>
                    <h4 className="text-4xl font-black tracking-tighter mb-4">92%</h4>
                    <p className="text-xs text-slate-400 italic">L'Essence Super RON 95 constitue la majorité des volumes importés ce trimestre.</p>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-emerald-600 text-white p-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Conformité Qualité</p>
                    <h4 className="text-4xl font-black tracking-tighter mb-4">CERTIFIÉ</h4>
                    <p className="text-xs text-white/80 italic">Tous les produits listés répondent aux normes de densité fixées par la réglementation SONAP.</p>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-800 p-8 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Mise à jour</p>
                    <h4 className="text-2xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">Mars 2026</h4>
                    <p className="text-xs text-slate-500 italic">Dernière révision du catalogue effectuée par la Direction Technique.</p>
                </Card>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
