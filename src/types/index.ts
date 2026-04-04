// Types for SIHG System

export type StockLevel = 'critical' | 'warning' | 'healthy' | 'full';

export type UserRole =
  | 'super_admin'
  | 'admin_etat'
  | 'inspecteur'
  | 'service_it'
  | 'secretaire_general'
  | 'directeur_general'
  | 'directeur_adjoint'
  | 'directeur_aval'
  | 'directeur_adjoint_aval'
  | 'chef_division_distribution'
  | 'chef_bureau_aval'
  | 'agent_supervision_aval'
  | 'controleur_distribution'
  | 'technicien_support_dsa'
  | 'technicien_flux'
  | 'responsable_entreprise'
  | 'responsable_stations'
  | 'gestionnaire_livraisons'
  | 'operateur_entreprise'
  | 'directeur_importation'
  | 'agent_importation'
  | 'responsable_stock'
  | 'agent_station'
  | 'technicien_aval';

export type EntrepriseType = 'compagnie' | 'distributeur';

export type StationType = 'urbaine' | 'routiere' | 'depot' | string;

export type AlertType = 'stock_critical' | 'stock_warning' | 'price_anomaly' | 'station_closed';

export type DossierStatus = 
  | 'recu'
  | 'incomplet'
  | 'numerise'
  | 'analyse_technique'
  | 'analyse_administrative'
  | 'analyse_juridique'
  | 'approuve'
  | 'rejete'
  | 'archive';

export interface Dossier {
  id: string;
  numero_dossier: string;
  type_demande: 'ouverture_station' | 'agrement_entreprise' | 'renouvellement_licence';
  entite_id: string;
  entite_type: 'station' | 'entreprise';
  entite_nom: string;
  statut: DossierStatus;
  priorite: 'haute' | 'normale' | 'basse';
  observations?: string;
  pieces_jointes: string[];
  date_soumission: string;
  updated_at: string;
  valide_par_dsa?: string;
  valide_par_dsi?: string;
  valide_par_dg?: string;
  rccm_url?: string;
  nif_url?: string;
  statuts_url?: string;
  autorisation_url?: string;
  date_validation_dsa?: string;
  date_validation_dsi?: string;
  date_validation_dg?: string;
}

export type StationStatus = 
  | 'ouverte' 
  | 'fermee' 
  | 'en_travaux' 
  | 'suspendu_legal'
  | 'attente_validation'
  | 'attente_dsa'      // Direction des Services Aval (Technique)
  | 'attente_dsi'      // Direction Service Information (Activation)
  | string;

export type EntrepriseStatus = 
  | 'actif' 
  | 'suspendu' 
  | 'ferme'
  | 'attente_validation'
  | 'attente_dsa'
  | 'attente_dsi';

export type ImportationStatus = 'prevu' | 'arrive' | 'en_dechargement' | 'termine' | string;

export interface Importation {
  id: string;
  navire: string;
  produit: 'essence' | 'gasoil' | 'jet_a1';
  quantite: number;
  entrepriseId: string;
  entrepriseNom: string;
  paysOrigine: string;
  dateArrivee: string;
  port: string;
  statut: ImportationStatus;
  documents?: {
    facture?: string;
    certificatQualite?: string;
    douane?: string;
    autorisation?: string;
  };
}


// Types d'observation pour inspecteurs
export type ObservationType =
  | 'pompe_en_panne'
  | 'prix_anormal'
  | 'station_fermee'
  | 'suspicion_anomalie'
  | 'autre';

export type ObservationStatus = 'ouverte' | 'traitee';

export interface Observation {
  id: string;
  station_id: string;
  station_nom?: string;
  inspecteur_id: string;
  inspecteur_nom?: string;
  type: ObservationType;
  description: string;
  date: string;
  statut: ObservationStatus;
  region?: string;
}

export interface Entreprise {
  id: string;
  nom: string;
  sigle: string;
  type: EntrepriseType;
  numeroAgrement: string;
  region: string;
  statut: EntrepriseStatus;
  nombreStations: number;
  logo?: string;
  contact: {
    nom: string;
    telephone: string;
    email: string;
  };
}

export interface Station {
  id: string;
  nom: string;
  code: string;
  adresse: string;
  ville: string;
  region: string;
  coordonnees?: { lat: number; lng: number };
  type: StationType;
  entrepriseId: string;
  entrepriseNom: string;
  entrepriseSigle?: string;
  entrepriseLogo?: string;
  capacite: {
    essence: number;
    gasoil: number;
    gpl: number;
    lubrifiants: number;
  };
  stockActuel: {
    essence: number;
    gasoil: number;
    gpl: number;
    lubrifiants: number;
  };
  nombrePompes: number;
  nombreCuves?: number;
  logo?: string;
  gestionnaire: {
    nom: string;
    telephone: string;
    email: string;
  };
  statut: StationStatus;
  legal_status?: string;
  is_legally_approved?: boolean;
  derniereLivraison?: {
    date: string;
    quantite: number;
    carburant: string;
  };
  // Score de risque pour inspecteurs
  scoreRisque?: number;
  isRiskOfShortage?: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  stationId: string;
  stationNom: string;
  entrepriseNom: string;
  message: string;
  niveau: 'critique' | 'alerte';
  dateCreation: string;
  resolu: boolean;
}

export interface DashboardStats {
  totalEntreprises: number;
  totalStations: number;
  stationsActives: number;
  alertesCritiques: number;
  alertesWarning: number;
  stockNationalEssence: number;
  stockNationalGasoil: number;
}

// Stats pour dashboard inspecteur
export interface InspecteurStats {
  totalStationsRegion: number;
  stationsEnAlerte: number;
  stocksCritiques: number;
  prixAnormaux: number;
  rupturesStock: number;
  observationsOuvertes: number;
}