import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Anchor, Plus, Search, Filter, Mail, Phone, Globe, 
  MoreVertical, Edit, Trash2, ExternalLink
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ImportFournisseur {
  id: string;
  nom: string;
  pays: string;
  contact_email: string | null;
  contact_tel: string | null;
  adresse: string | null;
  statut: string;
}

interface NewFournisseur {
  nom: string;
  pays: string;
  contact_email: string | null;
  contact_tel: string | null;
  adresse: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export default function ImportFournisseursPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['import-fournisseurs'],
    queryFn: async () => {
      const { data, error } = await db
        .from('import_fournisseurs')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return (data as ImportFournisseur[]) || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newSupplier: NewFournisseur) => {
      const { error } = await db
        .from('import_fournisseurs')
        .insert(newSupplier);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-fournisseurs'] });
      toast({ title: "Succès", description: "Fournisseur ajouté avec succès." });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: error.message || "Impossible d'enregistrer le fournisseur." 
      });
    }
  });

  const filteredSuppliers = suppliers?.filter((s: ImportFournisseur) => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.pays.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout 
      title="Trading & Fournisseurs Internationaux" 
      subtitle="Répertoire des compagnies pétrolières et traders internationaux agréés."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher un fournisseur..." 
              className="pl-10 h-11 border-none bg-slate-50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(role === 'super_admin' || role === 'directeur_importation' || role === 'agent_importation') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-primary/20 bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <Plus className="h-4 w-4" /> Nouveau Fournisseur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Ajouter un Trader</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 pt-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createMutation.mutate({
                    nom: formData.get('nom') as string,
                    pays: formData.get('pays') as string,
                    contact_email: formData.get('email') as string | null,
                    contact_tel: formData.get('tel') as string | null,
                    adresse: formData.get('adresse') as string | null,
                  });
                }}>
                  <div className="space-y-2">
                    <Label>Nom de la Compagnie</Label>
                    <Input name="nom" placeholder="Ex: Vitol, Trafigura..." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays d'origine</Label>
                    <Input name="pays" placeholder="Ex: Suisse, Singapour..." required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Contact</Label>
                      <Input name="email" type="email" placeholder="contact@trading.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input name="tel" placeholder="+..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse / Siège</Label>
                    <Input name="adresse" placeholder="Détails du siège social" />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={createMutation.isPending}>
                    Enregistrer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Compagnie</TableHead>
                <TableHead className="font-bold text-slate-900">Origine</TableHead>
                <TableHead className="font-bold text-slate-900">Contact</TableHead>
                <TableHead className="font-bold text-slate-900">Statut</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Chargement...</TableCell></TableRow>
              ) : filteredSuppliers?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 italic">Aucun fournisseur trouvé.</TableCell></TableRow>
              ) : filteredSuppliers?.map((s: ImportFournisseur) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {s.nom.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{s.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Globe className="h-3.5 w-3.5" /> {s.pays}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="h-3 w-3" /> {s.contact_email || 'n/a'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3 w-3" /> {s.contact_tel || 'n/a'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 uppercase text-[10px] font-black tracking-widest">
                      Agréé SONAP
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {role !== 'super_admin' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
