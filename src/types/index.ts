// Types for SIHG System

export type StockLevel = 'critical' | 'warning' | 'healthy' | 'full';

export type UserRole =
  | 'super_admin'
  | 'admin_etat'
  | 'inspecteur'
  | 'analyste'
  | 'personnel_admin'
  | 'service_it'
  | 'responsable_entreprise'
  | 'gestionnaire_station';

export type EntrepriseType = 'compagnie' | 'distributeur';

export type StationType = 'urbaine' | 'routiere' | 'depot' | string;

export type AlertType = 'stock_critical' | 'stock_warning' | 'price_anomaly' | 'station_closed';

export type StationStatus = 'ouverte' | 'fermee' | 'en_travaux' | 'attente_validation' | string;

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
  statut: 'actif' | 'suspendu' | 'ferme';
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
  gestionnaire: {
    nom: string;
    telephone: string;
    email: string;
  };
  statut: StationStatus;
  derniereLivraison?: {
    date: string;
    quantite: number;
    carburant: string;
  };
  // Score de risque pour inspecteurs
  scoreRisque?: number;
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