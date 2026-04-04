// Definition of roles and permissions for SIHG

export type AppRole =
  | 'super_admin'
  | 'admin_etat'
  | 'admin_central'
  | 'chef_regulation'
  | 'analyste_regulation'
  | 'directeur_general'
  | 'directeur_adjoint'
  | 'secretariat_direction'
  | 'directeur_aval'
  | 'directeur_adjoint_aval'
  | 'chef_division_distribution'
  | 'chef_service_aval'
  | 'agent_technique_aval'
  | 'controleur_distribution'
  | 'technicien_support_dsa'
  | 'technicien_flux'
  | 'inspecteur'
  | 'service_it'
  | 'directeur_juridique'
  | 'juriste'
  | 'charge_conformite'
  | 'assistant_juridique'
  | 'directeur_importation'
  | 'chef_service_importation'
  | 'agent_suivi_cargaison'
  | 'agent_reception_port'
  | 'analyste_approvisionnement'
  | 'directeur_administratif'
  | 'chef_service_administratif'
  | 'gestionnaire_documentaire'
  | 'directeur_logistique'
  | 'agent_logistique'
  | 'responsable_depots'
  | 'responsable_transport'
  | 'operateur_logistique'
  | 'technicien_aval'
  | 'agent_reception'
  | 'analyste'
  | 'responsable_entreprise'
  | 'gestionnaire_station'
  | 'superviseur_aval'
  | 'personnel_admin'
  | 'directeur_financier'
  | 'gestionnaire';

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Directeur Système Informatique',
  directeur_general: 'Directeur Général (DG)',
  directeur_adjoint: 'Directeur Général Adjoint (DGA)',
  admin_etat: 'Administrateur État (SONAP)',
  admin_central: 'Administrateur Central / Régulation',
  chef_regulation: 'Chef Service Régulation',
  analyste_regulation: 'Analyste Régulation',
  secretariat_direction: 'Secrétariat de Direction',
  directeur_aval: 'Directeur des Services Aval (DSA)',
  directeur_adjoint_aval: 'Directeur Adjoint des Services Aval',
  chef_division_distribution: 'Chef de Division Distribution',
  chef_service_aval: 'Chef de Service Aval (Validation DSA)',
  agent_technique_aval: 'Agent Technique Aval (Analyse DSA)',
  controleur_distribution: 'Contrôleur de Distribution',
  technicien_support_dsa: 'Technicien Support DSA',
  technicien_flux: 'Technicien Flux Opérationnels',
  inspecteur: 'Corps des Inspecteurs (Contrôle & Audit)',
  service_it: 'Directeur Adjoint Système Informatique',
  directeur_juridique: 'Directeur Juridique & Conformité (DJ/C)',
  juriste: 'Juriste / Conseiller Juridique',
  charge_conformite: 'Chargé de Conformité réglementaire',
  assistant_juridique: 'Assistant Administratif DJ/C',
  directeur_importation: 'Directeur Importation / Approvisionnement',
  chef_service_importation: 'Chef Service Importation',
  agent_suivi_cargaison: 'Agent de Suivi des Cargaisons',
  agent_reception_port: 'Agent de Réception (Port)',
  analyste_approvisionnement: 'Analyste Approvisionnement',
  directeur_administratif: 'Directeur Administratif (DA)',
  chef_service_administratif: 'Chef de Service Administratif',
  gestionnaire_documentaire: 'Gestionnaire Documentaire',
  directeur_logistique: 'Directeur de la Logistique',
  agent_logistique: 'Agent Logistique',
  responsable_depots: 'Responsable des Dépôts',
  responsable_transport: 'Responsable Transport & Flotte',
  operateur_logistique: 'Opérateur Logistique Terrain',
  technicien_aval: 'Technicien Services Aval (DSA)',
  agent_reception: 'Agent de Réception / Courrier (Accueil)',
  analyste: 'Analyste',
  responsable_entreprise: 'Responsable Entreprise',
  gestionnaire_station: 'Gestionnaire de Station',
  superviseur_aval: 'Superviseur Aval',
  personnel_admin: 'Personnel Administratif',
  directeur_financier: 'Directeur Financier',
  gestionnaire: 'Gestionnaire',
};

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  'super_admin': 1,
  'directeur_general': 2,
  'directeur_adjoint': 2,
  'admin_central': 2,
  'admin_etat': 3,
  'secretariat_direction': 4,
  'directeur_aval': 4,
  'directeur_adjoint_aval': 4,
  'chef_regulation': 5,
  'chef_division_distribution': 5,
  'chef_service_aval': 6,
  'agent_technique_aval': 7,
  'controleur_distribution': 7,
  'analyste_regulation': 8,
  'technicien_support_dsa': 8,
  'technicien_flux': 8,
  'inspecteur': 9,
  'service_it': 1,
  'directeur_juridique': 4,
  'juriste': 5,
  'charge_conformite': 6,
  'assistant_juridique': 7,
  'directeur_importation': 4,
  'chef_service_importation': 5,
  'agent_suivi_cargaison': 6,
  'agent_reception_port': 7,
  'analyste_approvisionnement': 8,
  'directeur_administratif': 4,
  'chef_service_administratif': 5,
  'gestionnaire_documentaire': 7,
  'directeur_logistique': 4,
  'agent_logistique': 5,
  'responsable_depots': 6,
  'responsable_transport': 6,
  'operateur_logistique': 7,
  'technicien_aval': 8,
  'agent_reception': 12,
  'analyste': 8,
  'responsable_entreprise': 5,
  'gestionnaire_station': 6,
  'superviseur_aval': 6,
  'personnel_admin': 7,
  'directeur_financier': 3,
  'gestionnaire': 10,
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Directeur Système Informatique (DSI). Autorité technique la plus élevée du système SIHG.',
  directeur_general: 'Directeur Général (DG) de la SONAP. Prend les grandes décisions internes, valide les dossiers importants.',
  directeur_adjoint: 'Directeur Général Adjoint (DGA). Assiste le DG, le remplace en cas d\'absence.',
  admin_etat: 'Administrateur État (SONAP). Création et validation des entreprises et stations-service.',
  admin_central: 'Administrateur Central / Régulation. Autorité suprême de régulation de l\'État.',
  chef_regulation: 'Chef Service Régulation. Validation intermédiaire des propositions.',
  analyste_regulation: 'Analyste Régulation. Analyse des données, propositions de quotas.',
  secretariat_direction: 'Secrétariat de Direction.',
  directeur_aval: 'Responsable national du secteur aval.',
  directeur_adjoint_aval: 'Assiste le directeur des Services Aval.',
  chef_division_distribution: 'Gère la distribution du carburant.',
  chef_service_aval: 'Chef de Service Aval (DSA).',
  agent_technique_aval: 'Agent Technique Aval (DSA).',
  controleur_distribution: 'Vérifie que les entreprises respectent les normes.',
  technicien_support_dsa: 'Gère les problèmes techniques module Aval.',
  technicien_flux: 'Suit les flux de carburant.',
  inspecteur: 'Agent de contrôle du secteur pétrolier.',
  service_it: 'Directeur Adjoint Système Informatique (DSI).',
  directeur_juridique: 'Responsable de la Direction Juridique.',
  juriste: 'Analyse juridique des dossiers.',
  charge_conformite: 'Garant du respect des normes.',
  assistant_juridique: 'Suivi administratif DJ/C.',
  directeur_importation: 'Supervision stratégique de l\'achat et de l\'approvisionnement.',
  chef_service_importation: 'Gestion opérationnelle des dossiers d\'importation.',
  agent_suivi_cargaison: 'Suivi en temps réel des navires et des cargaisons.',
  agent_reception_port: 'Enregistrement de l\'arrivée des navires au port et saisie des quantités réelles.',
  analyste_approvisionnement: 'Analyse de la consommation et prévision des besoins nationaux.',
  directeur_administratif: 'Supervision administrative.',
  chef_service_administratif: 'Encadrement personnel administratif.',
  gestionnaire_documentaire: 'Gestion base documentaire.',
  directeur_logistique: 'Pilotage chaîne logistique.',
  agent_logistique: 'Suivi opérationnel flux.',
  responsable_depots: 'Supervision technique dépôts.',
  responsable_transport: 'Gestion flotte camions.',
  operateur_logistique: 'Suivi chargements terrain.',
  technicien_aval: 'Expert support Aval.',
  agent_reception: 'Agent de Réception / Service Courrier.',
  analyste: 'Analyste de données.',
  responsable_entreprise: 'Gère une entreprise pétrolière.',
  gestionnaire_station: 'Responsable d\'une station-service.',
  superviseur_aval: 'Contrôle distribution terrain.',
  personnel_admin: 'Support administratif.',
  directeur_financier: 'Gestion financière.',
  gestionnaire: 'Gestionnaire de base.',
};

export const READ_ONLY_ROLES: AppRole[] = ['inspecteur', 'analyste_regulation', 'analyste', 'agent_technique_aval', 'technicien_support_dsa', 'secretariat_direction', 'directeur_general', 'directeur_adjoint', 'service_it', 'super_admin'];

export const USER_MANAGEMENT_ROLES: AppRole[] = [
  'super_admin', 'admin_etat', 'admin_central', 'directeur_general', 'directeur_adjoint',
  'directeur_aval', 'directeur_adjoint_aval', 'service_it',
  'directeur_juridique', 'directeur_importation', 'directeur_logistique', 'directeur_administratif', 'secretariat_direction',
  'responsable_entreprise'
];

export const OBSERVATION_ROLES: AppRole[] = ['inspecteur', 'chef_service_aval', 'agent_technique_aval'];

export const DATA_MODIFY_ROLES: AppRole[] = [
  'directeur_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval',
  'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport',
  'responsable_entreprise', 'gestionnaire_station'
];
