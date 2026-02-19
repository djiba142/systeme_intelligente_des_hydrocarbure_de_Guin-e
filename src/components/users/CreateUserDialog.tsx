import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, AppRole, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const userSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe doit contenir au moins 8 caractères').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Nom complet requis'),
  role: z.enum(['super_admin', 'responsable_entreprise']),
  phone: z.string().optional(),
  entrepriseId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
  initialData?: {
    user_id: string;
    email: string;
    full_name: string;
    role: AppRole;
    phone?: string;
    entreprise_id?: string;
  };
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated, initialData }: CreateUserDialogProps) {
  const { createUser, updateUser, role: currentUserRole, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<{ id: string, nom: string }[]>([]);
  const isEditMode = !!initialData;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      role: 'responsable_entreprise',
      phone: '',
      entrepriseId: '',
    },
  });

  // Correction : Ajout de form dans les dépendances
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        email: initialData.email,
        fullName: initialData.full_name,
        role: initialData.role as 'super_admin' | 'responsable_entreprise',
        phone: initialData.phone || '',
        entrepriseId: initialData.entreprise_id || '',
        password: '', 
      });
    } else if (open && !initialData) {
      form.reset({
        email: '',
        password: '',
        fullName: '',
        role: 'responsable_entreprise',
        phone: '',
        entrepriseId: '',
      });
    }
  }, [open, initialData, form]);

  const selectedRole = form.watch('role');

  // Correction : Stabilisation de fetchData avec useCallback
  const fetchData = useCallback(async () => {
    try {
      const { data: entData } = await supabase.from('entreprises').select('id, nom');
      setEntreprises(entData || []);
    } catch (error) {
      console.error('Error fetching data for dialog:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Correction : Ajout de form dans les dépendances
  useEffect(() => {
    if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id && open) {
      form.setValue('entrepriseId', currentUserProfile.entreprise_id);
      form.setValue('role', 'responsable_entreprise');
    }
  }, [currentUserRole, currentUserProfile, open, form]);

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true);

    try {
      if (isEditMode && initialData) {
        const { error } = await updateUser(initialData.user_id, {
          email: data.email,
          fullName: data.fullName,
          role: data.role as AppRole,
          entrepriseId: data.entrepriseId || undefined,
        });
        if (error) throw error;

        toast({
          title: "Utilisateur mis à jour",
          description: `Le compte de ${data.fullName} a été modifié avec succès.`,
        });
      } else {
        const { error } = await createUser({
          email: data.email,
          password: data.password || '',
          fullName: data.fullName,
          role: data.role as AppRole,
          entrepriseId: data.entrepriseId || undefined,
        });
        if (error) throw error;

        toast({
          title: "Utilisateur créé",
          description: `Le compte de ${data.fullName} (${data.email}) a été créé avec succès.`,
        });
      }

      form.reset();
      onOpenChange(false);
      onUserCreated?.();
    } catch (error) {
      // Correction : Gestion du type error au lieu de any
      console.error('Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'enregistrer l'utilisateur";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAllowedRoles = (): AppRole[] => {
    if (currentUserRole === 'super_admin') return ['super_admin', 'responsable_entreprise'];
    if (currentUserRole === 'responsable_entreprise') return ['responsable_entreprise'];
    return [];
  };

  const allowedRoles = getAllowedRoles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isEditMode ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modification des informations de ${initialData?.full_name}.`
              : 'Créer un nouveau compte utilisateur avec un rôle spécifique.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input
                id="fullName"
                {...form.register('fullName')}
                placeholder="Mamadou Diallo"
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="utilisateur@exemple.gn"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="+224 6XX XX XX XX"
              />
            </div>

            {!isEditMode && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                  placeholder="Minimum 8 caractères"
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
            )}

            <div className="col-span-2 space-y-2">
              <Label htmlFor="role">Rôle *</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) => form.setValue('role', value as 'super_admin' | 'responsable_entreprise')}
                disabled={currentUserRole === 'responsable_entreprise'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'responsable_entreprise' && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="entrepriseId">Entreprise</Label>
                <Select
                  value={form.watch('entrepriseId')}
                  onValueChange={(value) => form.setValue('entrepriseId', value)}
                  disabled={currentUserRole === 'responsable_entreprise'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {entreprises.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}