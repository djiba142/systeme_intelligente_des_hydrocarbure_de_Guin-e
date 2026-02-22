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

// All valid app roles for validation
const ALL_APP_ROLES = [
  'super_admin',
  'admin_etat',
  'inspecteur',
  'analyste',
  'personnel_admin',
  'service_it',
  'responsable_entreprise',
  'gestionnaire_station',
] as const;

const userSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe doit contenir au moins 8 caractères').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Nom complet requis'),
  role: z.enum(ALL_APP_ROLES),
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

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        email: initialData.email,
        fullName: initialData.full_name,
        role: initialData.role,
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

  // Auto-set company and role for responsable_entreprise users
  useEffect(() => {
    if (currentUserRole === 'responsable_entreprise' && currentUserProfile?.entreprise_id && open) {
      form.setValue('entrepriseId', currentUserProfile.entreprise_id);
      form.setValue('role', 'gestionnaire_station');
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
        if (!data.password || data.password.length < 8) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Le mot de passe doit contenir au moins 8 caractères.",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await createUser({
          email: data.email,
          password: data.password,
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
    if (currentUserRole === 'super_admin') {
      // Super admin can assign all roles
      return [...ALL_APP_ROLES];
    }
    if (currentUserRole === 'service_it') {
      // Service IT can assign most roles except super_admin
      return ALL_APP_ROLES.filter(r => r !== 'super_admin') as AppRole[];
    }
    if (currentUserRole === 'responsable_entreprise') {
      // Company manager can only create station managers
      return ['gestionnaire_station', 'responsable_entreprise'];
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();

  // Roles that need an enterprise assignment
  const rolesNeedingEntreprise: AppRole[] = [
    'responsable_entreprise',
    'gestionnaire_station',
  ];

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
                onValueChange={(value) => form.setValue('role', value as AppRole)}
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

            {rolesNeedingEntreprise.includes(selectedRole as AppRole) && (
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