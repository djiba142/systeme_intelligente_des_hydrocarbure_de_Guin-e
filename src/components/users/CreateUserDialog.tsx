import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Loader2, ShieldCheck } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, AppRole, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// All valid app roles for validation
const ALL_APP_ROLES = [
  'super_admin',
  'admin_etat',
  'directeur_general',
  'directeur_adjoint',
  'directeur_aval',
  'directeur_adjoint_aval',
  'chef_division_distribution',
  'chef_bureau_aval',
  'agent_supervision_aval',
  'controleur_distribution',
  'technicien_support_dsa',
  'technicien_flux',
  'inspecteur',
  'analyste',
  'personnel_admin',
  'service_it',
  'responsable_entreprise',
  'operateur_entreprise',
  'directeur_juridique',
  'juriste',
  'charge_conformite',
  'assistant_juridique',
  'directeur_financier',
  'controleur_financier',
  'comptable',
  'directeur_importation',
  'agent_importation',
  'directeur_logistique',
  'agent_logistique',
] as const;

export const POSTE_ROLES: Record<string, AppRole> = {
  'Directeur DSI': 'service_it',
  'Directeur des Services Aval (DSA)': 'directeur_aval',
  'Directeur Financier (DAF)': 'directeur_financier',
  'Directeur Juridique & Conformité': 'directeur_juridique',
  'Directeur Importation / Approvisionnement': 'directeur_importation',
  'Directeur Logistique SONAP': 'directeur_logistique',
  'Administrateur Central État (Régulation)': 'admin_etat',
  'Directeur Général (DG)': 'directeur_general',
  'Directeur Général Adjoint (DGA)': 'directeur_adjoint',
};

// Organigramme Officiel SONAP / SIHG
const ORGANISATIONS = [
  { id: 'admin_central', label: 'Administration Centrale' },
  { id: 'analyse', label: 'Cellule d’Analyse Stratégique (CAS)' },

  { id: 'planification_energetique', label: 'Cellule de Planification Énergétique' },
  { id: 'dsi', label: 'Direction des Systèmes Informatiques (DSI)' },
  { id: 'dsa', label: 'Direction des Services Aval' },
  { id: 'logistique', label: 'Direction Logistique et Administrative' },
  { id: 'inspecteurs', label: 'Corps National des Inspecteurs' },
  { id: 'juridique', label: 'Direction Juridique & Conformité (DJ/C)' },
  { id: 'finance', label: 'Direction Administrative et Financière (DAF)' },
  { id: 'importation', label: 'Direction Importation / Approvisionnement' },
  { id: 'entreprises', label: 'Entreprises Pétrolières Agréées (Siège)' },

];

const POSTES_PAR_ORG: Record<string, { label: string, role: AppRole }[]> = {
  // ─── Administration Centrale ───────────────────────────────
  admin_central: [
    { label: 'Directeur Général (DG)', role: 'directeur_general' },
    { label: 'Directeur Général Adjoint (DGA)', role: 'directeur_adjoint' },
    { label: 'Administrateur Central État (Régulation)', role: 'admin_etat' },
    { label: 'Chef de Service Régulation Nationale', role: 'admin_etat' },
  ],
  // ─── Cellule d'Analyse Stratégique ──────────────────────────────────────
  // ─── Cellule d'Analyse Stratégique ──────────────────────────────────────
  analyse: [
    { label: 'Analyste National (CAS)', role: 'analyste' },
    { label: 'Analyste Stratégique', role: 'analyste' },
    { label: 'Responsable Prévisions', role: 'analyste' },
    { label: 'Expert Sécurité Énergétique', role: 'analyste' },
  ],

  // ─── Cellule de Planification Énergétique ────────────────────────────────
  planification_energetique: [
    { label: 'Chef de la Cellule de Planification Énergétique', role: 'analyste' },
    { label: 'Analyste en Planification Énergétique', role: 'analyste' },
    { label: 'Statisticien Énergétique', role: 'analyste' },
  ],
  // ─── DSI ─────────────────────────────────────────────────────────────────
  dsi: [
    { label: 'Super Administrateur National', role: 'super_admin' },
    { label: 'Directeur DSI', role: 'service_it' },
    { label: 'Administrateur Système', role: 'service_it' },
    { label: 'Ingénieur Réseau / Infrastructure', role: 'service_it' },
    { label: 'Support Technique IT', role: 'service_it' },
  ],
  // ─── DSA — Direction des Services Aval ─────────────────────────────────────
  dsa: [
    { label: 'Directeur des Services Aval (DSA)', role: 'directeur_aval' },
    { label: 'Directeur Adjoint des Services Aval', role: 'directeur_adjoint_aval' },
    { label: 'Chef de Division Distribution', role: 'chef_division_distribution' },
    { label: 'Chef de Bureau Aval', role: 'chef_bureau_aval' },
    { label: 'Agent de Supervision Aval', role: 'agent_supervision_aval' },
    { label: 'Contrôleur de Distribution', role: 'controleur_distribution' },
    { label: 'Technicien Support DSA', role: 'technicien_support_dsa' },
    { label: 'Technicien Flux Opérationnels', role: 'technicien_flux' },
  ],
  // ─── Logistique & Admin ────────────────────────────────────────────────────
  logistique: [
    { label: 'Directeur Logistique (Supervision)', role: 'personnel_admin' },
    { label: 'Agent Administratif (Gestion Documentaire)', role: 'personnel_admin' },
    { label: 'Gestionnaire des Agréments', role: 'personnel_admin' },
    { label: 'Archiviste Numérique', role: 'personnel_admin' },
    { label: 'Directeur Logistique SONAP', role: 'directeur_logistique' },
    { label: 'Responsable des Dépôts Nationaux', role: 'agent_logistique' },
    { label: 'Agent de Dispatching', role: 'agent_logistique' },
    { label: 'Contrôleur des Mouvements de Stock', role: 'agent_logistique' },
  ],
  // ─── Corps des Inspecteurs ─────────────────────────────────────────────────
  inspecteurs: [
    { label: 'Inspecteur National', role: 'inspecteur' },
    { label: 'Inspecteur Régional', role: 'inspecteur' },
    { label: 'Inspecteur Préfectoral', role: 'inspecteur' },
    { label: 'Inspecteur Local (Terrain)', role: 'inspecteur' },
  ],
  // ─── Direction Juridique & Conformité ─────────────────────────────────────
  juridique: [
    { label: 'Directeur Juridique & Conformité', role: 'directeur_juridique' },
    { label: 'Juriste / Conseiller Juridique', role: 'juriste' },
    { label: 'Chargé de Conformité Réglementaire', role: 'charge_conformite' },
    { label: 'Assistant Administratif DJ/C', role: 'assistant_juridique' },
  ],
  // ─── Direction Administrative et Financière (DAF) ────────────────────────
  finance: [
    { label: 'Directeur Financier (DAF)', role: 'directeur_financier' },
    { label: 'Contrôleur Financier', role: 'controleur_financier' },
    { label: 'Chef de Service Comptabilité', role: 'comptable' },
    { label: 'Trésorier', role: 'comptable' },
  ],
  // ─── Direction Importation / Approvisionnement ───────────────────────────
  importation: [
    { label: 'Directeur Importation / Approvisionnement', role: 'directeur_importation' },
    { label: 'Chef de Bureau Importation', role: 'agent_importation' },
    { label: 'Agent de Suivi des Cargaisons', role: 'agent_importation' },
    { label: 'Analyste Approvisionnement', role: 'agent_importation' },
  ],

  // ─── Entreprises Pétrolières ───────────────────────────────────────────────
  entreprises: [
    { label: 'Directeur d\'Entreprise Pétrolière', role: 'responsable_entreprise' },
    { label: 'Responsable Logistique', role: 'operateur_entreprise' },
    { label: 'Opérateur Citerne / Logistique', role: 'operateur_entreprise' },
  ],

};

const userSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe doit contenir au moins 8 caractères').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  sexe: z.enum(['M', 'F']),
  dateNaissance: z.string().min(1, 'Date de naissance requise'),
  phone: z.string().min(8, 'Téléphone requis'),
  adresse: z.string().optional(),
  organisation: z.string().min(1, 'Organisation requise'),
  direction: z.string().optional(),
  poste: z.string().min(1, 'Poste requis'),
  matricule: z.string().min(2, 'Matricule requis'),
  region: z.string().min(1, 'Région requise'),
  prefecture: z.string().optional(),
  commune: z.string().optional(),
  entrepriseId: z.string().optional(),
  stationId: z.string().optional(),
  forcePasswordChange: z.boolean().default(false),
  role: z.enum(ALL_APP_ROLES),
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
    prenom?: string;
    role?: AppRole;
    phone?: string;
    sexe?: 'M' | 'F';
    date_naissance?: string;
    adresse?: string;
    matricule?: string;
    entreprise_id?: string;
    station_id?: string;
    region?: string;
    prefecture?: string;
    commune?: string;
    organisation?: string;
    direction?: string;
    poste?: string;
    force_password_change?: boolean;
  };
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated, initialData }: CreateUserDialogProps) {
  const { createUser, updateUser, role: currentUserRole, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<{ id: string, nom: string }[]>([]);
  const [stations, setStations] = useState<{ id: string, nom: string }[]>([]);
  const isEditMode = !!initialData;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      prenom: '',
      email: '',
      phone: '',
      sexe: 'M',
      dateNaissance: '',
      adresse: '',
      organisation: '',
      direction: '',
      poste: '',
      matricule: '',
      region: '',
      prefecture: '',
      commune: '',
      entrepriseId: '',
      stationId: '',
      forcePasswordChange: true,
      role: undefined as any,
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        email: initialData.email,
        fullName: initialData.full_name,
        prenom: initialData.prenom || '',
        role: initialData.role,
        phone: initialData.phone || '',
        sexe: initialData.sexe || 'M',
        dateNaissance: initialData.date_naissance || '',
        adresse: initialData.adresse || '',
        matricule: initialData.matricule || '',
        entrepriseId: initialData.entreprise_id || '',
        stationId: initialData.station_id || '',
        organisation: initialData.organisation || '',
        direction: initialData.direction || '',
        poste: initialData.poste || '',
        region: initialData.region || '',
        prefecture: initialData.prefecture || '',
        commune: initialData.commune || '',
        forcePasswordChange: initialData.force_password_change || false,
        password: '',
      });
    } else if (open && !initialData) {
      form.reset({
        fullName: '',
        prenom: '',
        email: '',
        phone: '',
        sexe: 'M',
        dateNaissance: '',
        adresse: '',
        organisation: '',
        direction: '',
        poste: '',
        matricule: '',
        region: '',
        prefecture: '',
        commune: '',
        entrepriseId: '',
        stationId: '',
        forcePasswordChange: true,
        password: '',
        role: undefined as any,
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
      form.setValue('organisation', 'entreprises');
      form.setValue('role', 'operateur_entreprise');
    }
  }, [currentUserRole, currentUserProfile, open, form]);

  const watchedEntrepriseId = form.watch('entrepriseId');

  // Fetch stations when entreprise changes
  useEffect(() => {
    const fetchStations = async () => {
      if (watchedEntrepriseId) {
        try {
          const { data } = await supabase
            .from('stations')
            .select('id, nom')
            .eq('entreprise_id', watchedEntrepriseId)
            .order('nom');
          setStations(data || []);
        } catch (error) {
          console.error('Error fetching stations:', error);
        }
      } else {
        setStations([]);
      }
    };
    fetchStations();
  }, [watchedEntrepriseId]);

  const watchedOrg = form.watch('organisation');
  const watchedPoste = form.watch('poste');

  // Auto-sync Role based on Poste
  useEffect(() => {
    if (watchedOrg && watchedPoste) {
      const posteInfo = POSTES_PAR_ORG[watchedOrg]?.find(p => p.label === watchedPoste);
      if (posteInfo && !isEditMode) {
        form.setValue('role', posteInfo.role);
      }
    }
  }, [watchedOrg, watchedPoste, form, isEditMode]);

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true);

    try {
      if (isEditMode && initialData) {
        const { error } = await updateUser(initialData.user_id, {
          email: data.email,
          fullName: data.fullName,
          prenom: data.prenom,
          role: data.role as AppRole,
          entrepriseId: data.entrepriseId || undefined,
          stationId: data.stationId || undefined,
          organisation: data.organisation,
          direction: data.direction,
          poste: data.poste,
          sexe: data.sexe,
          dateNaissance: data.dateNaissance,
          adresse: data.adresse,
          matricule: data.matricule,
          region: data.region,
          prefecture: data.prefecture,
          commune: data.commune,
          forcePasswordChange: data.forcePasswordChange,
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
          prenom: data.prenom,
          role: data.role as AppRole,
          entrepriseId: data.entrepriseId || undefined,
          stationId: data.stationId || undefined,
          organisation: data.organisation,
          direction: data.direction,
          poste: data.poste,
          sexe: data.sexe,
          dateNaissance: data.dateNaissance,
          adresse: data.adresse,
          matricule: data.matricule,
          region: data.region,
          prefecture: data.prefecture,
          commune: data.commune,
          forcePasswordChange: data.forcePasswordChange,
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
      let errorMessage = error instanceof Error ? error.message : "Impossible d'enregistrer l'utilisateur";
      
      // Handle the Postgres 55P04 error (unsafe enum use)
      if (errorMessage.includes('55P04') || errorMessage.includes('enum app_role')) {
        errorMessage = "Le rôle sélectionné vient d'être créé et n'est pas encore prêt. Veuillez patienter 1 minute ou contacter la DSI pour rafraîchir le schéma.";
      }

      toast({
        variant: "destructive",
        title: "Erreur de Création",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAllowedRoles = (): AppRole[] => {
    // 1️⃣ Super Administrateur (niveau système / DSI)
    if (currentUserRole === 'super_admin') {
      // Peut créer : Tout le monde (Autorité suprême)
      return [
        'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution',
        'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution',
        'technicien_support_dsa', 'technicien_flux', 
        'inspecteur', 'analyste', 'personnel_admin', 'service_it', 'responsable_entreprise', 
        'operateur_entreprise',
        'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
        'directeur_financier', 'controleur_financier', 'comptable',
        'directeur_importation', 'agent_importation', 
        'directeur_logistique', 'agent_logistique'
      ];
    }
    
    // 2️⃣ Administrateur central État (Direction Générale SONAP - DG / DGA)
    if (currentUserRole === 'admin_etat' || currentUserRole === 'directeur_general' || currentUserRole === 'directeur_adjoint') {
      // Autorité administrative nationale : Peut créer les cadres et les gérants
      return [
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution',
        'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution',
        'technicien_support_dsa', 'technicien_flux',
        'responsable_entreprise', 'operateur_entreprise',
        'inspecteur', 'analyste', 'personnel_admin',
        'directeur_financier', 'controleur_financier', 'comptable', 
        'directeur_importation', 'agent_importation', 
        'directeur_logistique', 'agent_logistique'
      ];
    }
    
    // 3️⃣ Directions Thématiques (DAF, DJ/C, Import, Logistique)
    if (currentUserRole === 'directeur_juridique') {
      return ['juriste', 'charge_conformite', 'assistant_juridique'];
    }

    if (currentUserRole === 'directeur_financier') {
      return ['controleur_financier', 'comptable'];
    }

    if (currentUserRole === 'directeur_importation') {
      return ['agent_importation'];
    }

    if (currentUserRole === 'directeur_logistique') {
      return ['agent_logistique'];
    }

    if (currentUserRole === 'service_it') {
      // La DSI gère la création technique de tous les comptes
      return [
        'super_admin', 'service_it', 'admin_etat', 'directeur_general', 'directeur_adjoint', 
        'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution',
        'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution',
        'technicien_support_dsa', 'technicien_flux',
        'inspecteur', 'analyste', 'personnel_admin', 'responsable_entreprise', 'operateur_entreprise', 
        'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
        'directeur_financier', 'controleur_financier', 'comptable',
        'directeur_importation', 'agent_importation', 
        'directeur_logistique', 'agent_logistique'
      ];
    }

    if (currentUserRole === 'responsable_entreprise') {
      // Company manager can create operators inside their company
      return ['responsable_entreprise', 'operateur_entreprise'];
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();

  // Filter organizations based on current user role
  const allowedOrganisations = ORGANISATIONS.filter(org => {
    if (currentUserRole === 'super_admin' || currentUserRole === 'service_it') return true;
    
    // DSA Supervisor can only see DSA items
    if (currentUserRole === 'directeur_aval' || currentUserRole === 'directeur_adjoint_aval') {
      return ['dsa'].includes(org.id);
    }
    
    // Entreprise Manager can only see Stations and Entreprises (their own)
    if (currentUserRole === 'responsable_entreprise') {
      return ['entreprises', 'stations'].includes(org.id);
    }

    // Direction specific filters
    if (currentUserRole === 'directeur_juridique') return org.id === 'juridique';
    if (currentUserRole === 'directeur_financier') return org.id === 'finance';
    if (currentUserRole === 'directeur_importation') return org.id === 'importation';
    if (currentUserRole === 'directeur_logistique') return org.id === 'logistique';

    // Admin Etat / DG can see everything related to business but not system
    if (['admin_etat', 'directeur_general', 'directeur_adjoint'].includes(currentUserRole || '')) {
      return !['dsi'].includes(org.id);
    }

    return false;
  });

  // Roles that need an enterprise assignment
  const rolesNeedingEntreprise: AppRole[] = [
    'responsable_entreprise',
    'operateur_entreprise',
    'agent_supervision_aval',
    'controleur_distribution',
    'chef_bureau_aval',
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-4">
          {/* 1️⃣ Informations personnelles */}
          <div className="space-y-4">
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg border-none">1. INFORMATIONS PERSONNELLES</Badge>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input {...form.register('fullName')} placeholder="Nom" className="rounded-xl border-slate-200" />
                {form.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input {...form.register('prenom')} placeholder="Prénom" className="rounded-xl border-slate-200" />
                {form.formState.errors.prenom && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.prenom.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sexe *</Label>
                <Select value={form.watch('sexe')} onValueChange={(v) => form.setValue('sexe', v as any)}>
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.sexe && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.sexe.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Date de naissance *</Label>
                <Input type="date" {...form.register('dateNaissance')} className="rounded-xl border-slate-200" />
                {form.formState.errors.dateNaissance && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.dateNaissance.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Téléphone *</Label>
                <Input {...form.register('phone')} placeholder="+224 ..." className="rounded-xl border-slate-200" />
                {form.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input {...form.register('email')} placeholder="email@sonap.gn" className="rounded-xl border-slate-200" />
                {form.formState.errors.email && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.email.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input {...form.register('adresse')} placeholder="Quartier, Commune ..." className="rounded-xl border-slate-200" />
                {form.formState.errors.adresse && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.adresse.message}</p>}
              </div>
            </div>
          </div>

          {/* 2️⃣ Informations professionnelles */}
          <div className="space-y-4 pt-4 border-t">
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg border-none uppercase">2. Informations professionnelles</Badge>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organisation *</Label>
                <Select value={form.watch('organisation')} onValueChange={(v) => { form.setValue('organisation', v); form.setValue('poste', ''); }}>
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {allowedOrganisations.map(org => <SelectItem key={org.id} value={org.id}>{org.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.organisation && (
                  <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-tighter italic">
                    {form.formState.errors.organisation.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Poste *</Label>
                <Select 
                  value={form.watch('poste')} 
                  onValueChange={(v) => {
                    form.setValue('poste', v);
                    // Trouvons le rôle associé à ce poste dans l'organisation sélectionnée
                    const org = form.getValues('organisation');
                    if (org && POSTES_PAR_ORG[org]) {
                      const posteInfo = POSTES_PAR_ORG[org].find(p => p.label === v);
                      if (posteInfo) {
                        form.setValue('role', posteInfo.role);
                      }
                    }
                  }} 
                  disabled={!form.watch('organisation')}
                >
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {POSTES_PAR_ORG[form.watch('organisation') || '']?.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.poste && (
                  <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-tighter italic">
                    {form.formState.errors.poste.message}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Label className="text-primary font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Rôle & Niveau d'Accès Système *
                </Label>
                <Select value={form.watch('role')} onValueChange={(v) => form.setValue('role', v as AppRole)}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Déterminé par le poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Niveau National */}
                    <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">Niveau National (SIHG / SONAP)</div>
                    {allowedRoles.filter(r => [
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'service_it', 
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 
                      'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 
                      'technicien_support_dsa', 'technicien_flux',
                      'inspecteur', 'analyste', 'personnel_admin', 
                      'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
                      'directeur_financier', 'controleur_financier', 'comptable',
                      'directeur_importation', 'agent_importation', 
                      'directeur_logistique', 'agent_logistique'
                    ].includes(r)).map(r => (
                      <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                    ))}
                    
                    {/* Niveau Entreprise */}
                    <div className="px-2 py-1.5 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50/10 mt-2">Niveau Entreprise Pétrolière</div>
                    {allowedRoles.filter(r => ['responsable_entreprise', 'operateur_entreprise'].includes(r)).map(r => (
                      <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                    ))}


                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-tighter italic">
                    {form.formState.errors.role.message}
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground italic px-1">
                  Le rôle définit les permissions d'accès et de modification dans SIHG.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Direction / Département</Label>
                <Input {...form.register('direction')} placeholder="Ex: Ressources Humaines" className="rounded-xl border-slate-200" />
                {form.formState.errors.direction && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.direction.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Matricule professionnel *</Label>
                <Input {...form.register('matricule')} placeholder="MAT-XXXX" className="rounded-xl border-slate-200 uppercase" />
                {form.formState.errors.matricule && (
                  <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-tighter italic">
                    {form.formState.errors.matricule.message}
                  </p>
                )}
              </div>

              {/* Entreprise & Station (Dynamique) */}
              {rolesNeedingEntreprise.includes(selectedRole as AppRole) && (
                <div className="col-span-2 space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Entreprise Pétrolière Rattachée *</Label>
                        <Select 
                            value={form.watch('entrepriseId')} 
                            onValueChange={(v) => { form.setValue('entrepriseId', v); form.setValue('stationId', ''); }}
                            disabled={currentUserRole === 'responsable_entreprise'}
                        >
                            <SelectTrigger className="rounded-xl border-primary/30 bg-primary/5"><SelectValue placeholder="Choisir l'entreprise" /></SelectTrigger>
                            <SelectContent>
                                {entreprises.map(e => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.entrepriseId && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.entrepriseId.message}</p>}
                    </div>


                </div>
              )}
            </div>
          </div>

          {/* 3️⃣ Localisation administrative */}
          <div className="space-y-4 pt-4 border-t">
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg border-none uppercase">3. Localisation administrative</Badge>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Région *</Label>
                <Input {...form.register('region')} placeholder="Région" className="rounded-xl border-slate-200" />
                {form.formState.errors.region && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.region.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Préfecture</Label>
                <Input {...form.register('prefecture')} placeholder="Préfecture" className="rounded-xl border-slate-200" />
                {form.formState.errors.prefecture && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.prefecture.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Commune</Label>
                <Input {...form.register('commune')} placeholder="Commune" className="rounded-xl border-slate-200" />
                {form.formState.errors.commune && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.commune.message}</p>}
              </div>
            </div>
          </div>

          {/* 4️⃣ Informations de connexion */}
          <div className="space-y-4 pt-4 border-t">
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg border-none uppercase">4. Informations de connexion</Badge>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom d'utilisateur (Email)</Label>
                  <Input disabled value={form.watch('email')} className="rounded-xl border-slate-200 bg-slate-50" />
                </div>
                {!isEditMode && (
                  <div className="space-y-2">
                    <Label>Mot de passe *</Label>
                    <Input type="password" {...form.register('password')} className="rounded-xl border-slate-200" />
                    {form.formState.errors.password && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.password.message}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <input 
                  type="checkbox" 
                  id="forcePasswordChange" 
                  className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500"
                  checked={form.watch('forcePasswordChange')}
                  onChange={(e) => form.setValue('forcePasswordChange', e.target.checked)}
                />
                <Label htmlFor="forcePasswordChange" className="text-amber-900 font-bold text-xs cursor-pointer">
                  Obliger le changement du mot de passe à la première connexion
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-xl px-10 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Enregistrer' : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
