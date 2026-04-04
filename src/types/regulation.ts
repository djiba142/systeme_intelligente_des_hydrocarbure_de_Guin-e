// Types for Regulation Module — Admin Central / SONAP

export type WorkflowStatus = 'en_analyse' | 'propose' | 'valide' | 'rejete' | 'publie';

export type ProduitPetrolier = 'essence' | 'gasoil' | 'jet_a1' | 'gpl';

// ─── QUOTAS ────────────────────────────────────────────
export interface Quota {
  id: string;
  entreprise_id: string;
  entreprise_nom: string;
  entreprise_sigle?: string;
  produit: ProduitPetrolier;
  quantite: number; // en litres
  quantite_utilisee: number;
  periode: string; // ex: '2026-03'
  statut: WorkflowStatus;
  propose_par?: string;
  valide_par?: string;
  publie_par?: string;
  motif_rejet?: string;
  document_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── AGRÉMENTS ─────────────────────────────────────────
export type AgrementType = 'importation' | 'distribution' | 'stockage' | 'transport';

export interface Agrement {
  id: string;
  entreprise_id: string;
  entreprise_nom: string;
  numero: string;
  type_agrement: AgrementType;
  date_emission: string;
  date_expiration: string;
  statut: WorkflowStatus;
  signe_par?: string;
  motif_rejet?: string;
  pieces_jointes?: string[];
  document_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── LICENCES ──────────────────────────────────────────
export type LicenceType = 'exploitation' | 'distribution' | 'importation' | 'transport';

export interface Licence {
  id: string;
  entreprise_id: string;
  entreprise_nom: string;
  entreprise_sigle?: string;
  numero: string;
  type_licence: LicenceType;
  date_emission: string;
  date_expiration: string;
  statut: 'active' | 'suspendue' | 'expiree' | 'annulee';
  delivre_par?: string;
  document_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── JOURNAL DE RÉGULATION ─────────────────────────────
export interface RegulationLog {
  id: string;
  action: string;
  entite_type: 'quota' | 'agrement' | 'licence' | 'entreprise';
  entite_id: string;
  auteur_id: string;
  auteur_nom: string;
  date: string;
  details?: string;
}

// ─── STATISTIQUES DASHBOARD ────────────────────────────
export interface RegulationStats {
  totalEntreprises: number;
  quotasActifs: number;
  agrementsValides: number;
  licencesActives: number;
  alertesCritiques: number;
  quotasEnAttente: number;
}
