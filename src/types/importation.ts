
export type ImportWorkflowStatus = 
  | 'en_preparation' 
  | 'attente_juridique' 
  | 'en_transport' 
  | 'arrive' 
  | 'receptionne' 
  | 'rejete';

export interface ImportDossier {
  id: string;
  numero: string;
  produit: string;
  quantite: number;
  fournisseur: string;
  navire: string;
  eta: string;
  statut: ImportWorkflowStatus;
  date_creation: string;
  montant?: number;
  devise?: string;
}
