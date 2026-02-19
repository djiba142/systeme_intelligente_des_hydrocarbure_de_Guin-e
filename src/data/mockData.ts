import { Entreprise, Station, Alert, DashboardStats } from '@/types';

// Import logos
import logoTotalEnergies from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

export const mockEntreprises: Entreprise[] = [
  {
    id: '1',
    nom: 'TotalEnergies Guinée',
    sigle: 'TotalEnergies',
    type: 'compagnie',
    numeroAgrement: 'AGR-2024-001',
    region: 'Nationale',
    statut: 'actif',
    nombreStations: 45,
    logo: logoTotalEnergies,
    contact: {
      nom: 'Mamadou Diallo',
      telephone: '+224 622 00 00 01',
      email: 'contact@totalenergies.gn'
    }
  },
  {
    id: '2',
    nom: 'Vivo Energy Guinée (Shell)',
    sigle: 'Shell',
    type: 'compagnie',
    numeroAgrement: 'AGR-2024-002',
    region: 'Nationale',
    statut: 'actif',
    nombreStations: 35,
    logo: logoShell,
    contact: {
      nom: 'Aissatou Bah',
      telephone: '+224 622 00 00 02',
      email: 'contact@vivoenergy.gn'
    }
  },
  {
    id: '3',
    nom: 'Trans-Marine International',
    sigle: 'TMI',
    type: 'distributeur',
    numeroAgrement: 'AGR-2024-003',
    region: 'Conakry',
    statut: 'actif',
    nombreStations: 18,
    logo: logoTMI,
    contact: {
      nom: 'Tafsirou Ndiaye',
      telephone: '+224 622 00 00 03',
      email: 'contact@tmi-guinee.gn'
    }
  },
  {
    id: '4',
    nom: 'Star Oil Guinée',
    sigle: 'Star Oil',
    type: 'compagnie',
    numeroAgrement: 'AGR-2024-004',
    region: 'Nationale',
    statut: 'actif',
    nombreStations: 28,
    logo: undefined,
    contact: {
      nom: 'Ibrahima Sow',
      telephone: '+224 622 00 00 04',
      email: 'contact@staroil.gn'
    }
  },
  {
    id: '5',
    nom: 'Kamsar Petroleum',
    sigle: 'KP',
    type: 'distributeur',
    numeroAgrement: 'AGR-2024-005',
    region: 'Conakry',
    statut: 'actif',
    nombreStations: 22,
    logo: logoKP,
    contact: {
      nom: 'Oumar Barry',
      telephone: '+224 622 00 00 05',
      email: 'contact@kamsarpetroleum.gn'
    }
  }
];

export const mockStations: Station[] = [
  // TotalEnergies Stations
  {
    id: '1',
    nom: 'TotalEnergies Hamdallaye',
    code: 'TE-HAM-001',
    adresse: 'Carrefour Hamdallaye, Commune de Ratoma',
    ville: 'Conakry',
    region: 'Conakry',
    coordonnees: { lat: 9.5915, lng: -13.5866 },
    type: 'urbaine',
    entrepriseId: '1',
    entrepriseNom: 'TotalEnergies',
    logo: logoTotalEnergies,
    capacite: { essence: 100000, gasoil: 120000, gpl: 15000, lubrifiants: 5000 },
    stockActuel: { essence: 75000, gasoil: 96000, gpl: 12000, lubrifiants: 4200 },
    nombrePompes: 8,
    gestionnaire: { nom: 'Alpha Keita', telephone: '+224 621 00 01 01', email: 'alpha.keita@totalenergies.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-30', quantite: 35000, carburant: 'essence' }
  },
  {
    id: '2',
    nom: 'TotalEnergies Kaloum Centre',
    code: 'TE-KAL-001',
    adresse: 'Boulevard du Commerce, Kaloum',
    ville: 'Conakry',
    region: 'Conakry',
    coordonnees: { lat: 9.5095, lng: -13.7123 },
    type: 'urbaine',
    entrepriseId: '1',
    entrepriseNom: 'TotalEnergies',
    logo: logoTotalEnergies,
    capacite: { essence: 80000, gasoil: 100000, gpl: 10000, lubrifiants: 4000 },
    stockActuel: { essence: 8000, gasoil: 85000, gpl: 8500, lubrifiants: 3500 },
    nombrePompes: 6,
    gestionnaire: { nom: 'Mariama Sylla', telephone: '+224 621 00 01 02', email: 'mariama.sylla@totalenergies.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-25', quantite: 28000, carburant: 'gasoil' }
  },
  {
    id: '3',
    nom: 'TotalEnergies Matam',
    code: 'TE-MAT-001',
    adresse: 'Route de Matam, Matam',
    ville: 'Conakry',
    region: 'Conakry',
    type: 'urbaine',
    entrepriseId: '1',
    entrepriseNom: 'TotalEnergies',
    logo: logoTotalEnergies,
    capacite: { essence: 90000, gasoil: 110000, gpl: 12000, lubrifiants: 4500 },
    stockActuel: { essence: 81000, gasoil: 99000, gpl: 10800, lubrifiants: 4050 },
    nombrePompes: 7,
    gestionnaire: { nom: 'Sekou Camara', telephone: '+224 621 00 01 03', email: 'sekou.camara@totalenergies.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-29', quantite: 30000, carburant: 'essence' }
  },

  // Shell (Vivo Energy) Stations
  {
    id: '4',
    nom: 'Shell Belle-Vue',
    code: 'SH-BEL-001',
    adresse: 'Route de Donka, Commune de Dixinn',
    ville: 'Conakry',
    region: 'Conakry',
    coordonnees: { lat: 9.5350, lng: -13.6780 },
    type: 'urbaine',
    entrepriseId: '2',
    entrepriseNom: 'Shell',
    logo: logoShell,
    capacite: { essence: 95000, gasoil: 115000, gpl: 12000, lubrifiants: 5000 },
    stockActuel: { essence: 85500, gasoil: 103500, gpl: 10800, lubrifiants: 4500 },
    nombrePompes: 8,
    gestionnaire: { nom: 'Fanta Touré', telephone: '+224 621 00 02 01', email: 'fanta.toure@vivoenergy.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-30', quantite: 40000, carburant: 'essence' }
  },
  {
    id: '5',
    nom: 'Shell Cosa',
    code: 'SH-COS-001',
    adresse: 'Carrefour Cosa, Ratoma',
    ville: 'Conakry',
    region: 'Conakry',
    type: 'urbaine',
    entrepriseId: '2',
    entrepriseNom: 'Shell',
    logo: logoShell,
    capacite: { essence: 85000, gasoil: 100000, gpl: 10000, lubrifiants: 4000 },
    stockActuel: { essence: 5100, gasoil: 8000, gpl: 1000, lubrifiants: 400 },
    nombrePompes: 6,
    gestionnaire: { nom: 'Mamadou Bah', telephone: '+224 621 00 02 02', email: 'mamadou.bah@vivoenergy.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-20', quantite: 20000, carburant: 'essence' }
  },
  {
    id: '6',
    nom: 'Shell Nongo',
    code: 'SH-NON-001',
    adresse: 'Carrefour Nongo, Ratoma',
    ville: 'Conakry',
    region: 'Conakry',
    type: 'urbaine',
    entrepriseId: '2',
    entrepriseNom: 'Shell',
    logo: logoShell,
    capacite: { essence: 75000, gasoil: 90000, gpl: 8000, lubrifiants: 3500 },
    stockActuel: { essence: 67500, gasoil: 81000, gpl: 7200, lubrifiants: 3150 },
    nombrePompes: 5,
    gestionnaire: { nom: 'Ousmane Diallo', telephone: '+224 621 00 02 03', email: 'ousmane.diallo@vivoenergy.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-28', quantite: 25000, carburant: 'gasoil' }
  },

  // TMI Stations
  {
    id: '7',
    nom: 'TMI Kagbelen',
    code: 'TMI-KAG-001',
    adresse: 'Zone industrielle de Kagbelen, Sortie Conakry',
    ville: 'Dubréka',
    region: 'Kindia',
    coordonnees: { lat: 9.7891, lng: -13.5234 },
    type: 'routiere',
    entrepriseId: '3',
    entrepriseNom: 'TMI',
    logo: logoTMI,
    capacite: { essence: 150000, gasoil: 200000, gpl: 20000, lubrifiants: 8000 },
    stockActuel: { essence: 22500, gasoil: 180000, gpl: 18000, lubrifiants: 7200 },
    nombrePompes: 12,
    gestionnaire: { nom: 'Ibrahima Condé', telephone: '+224 621 00 03 01', email: 'ibrahima.conde@tmi-guinee.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-29', quantite: 50000, carburant: 'gasoil' }
  },
  {
    id: '8',
    nom: 'TMI Coyah Centre',
    code: 'TMI-COY-001',
    adresse: 'Centre-ville, Route Nationale 1',
    ville: 'Coyah',
    region: 'Kindia',
    type: 'routiere',
    entrepriseId: '3',
    entrepriseNom: 'TMI',
    logo: logoTMI,
    capacite: { essence: 80000, gasoil: 120000, gpl: 10000, lubrifiants: 5000 },
    stockActuel: { essence: 72000, gasoil: 108000, gpl: 9000, lubrifiants: 4500 },
    nombrePompes: 6,
    gestionnaire: { nom: 'Lansana Kouyaté', telephone: '+224 621 00 03 02', email: 'lansana.kouyate@tmi-guinee.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-27', quantite: 35000, carburant: 'essence' }
  },

  // Star Oil Stations
  {
    id: '9',
    nom: 'Star Oil Aéroport',
    code: 'SO-AER-001',
    adresse: 'Face Aéroport Ahmed Sékou Touré, Commune de Matoto',
    ville: 'Conakry',
    region: 'Conakry',
    coordonnees: { lat: 9.5769, lng: -13.6120 },
    type: 'urbaine',
    entrepriseId: '4',
    entrepriseNom: 'Star Oil',
    // logo: undefined,
    capacite: { essence: 120000, gasoil: 150000, gpl: 15000, lubrifiants: 6000 },
    stockActuel: { essence: 108000, gasoil: 135000, gpl: 13500, lubrifiants: 5400 },
    nombrePompes: 10,
    gestionnaire: { nom: 'Fatoumata Camara', telephone: '+224 621 00 04 01', email: 'fatoumata.camara@staroil.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-30', quantite: 45000, carburant: 'essence' }
  },
  {
    id: '10',
    nom: 'Star Oil Matoto',
    code: 'SO-MAT-001',
    adresse: 'Carrefour Matoto, Route Le Prince',
    ville: 'Conakry',
    region: 'Conakry',
    type: 'urbaine',
    entrepriseId: '4',
    entrepriseNom: 'Star Oil',
    // logo: undefined,
    capacite: { essence: 90000, gasoil: 110000, gpl: 10000, lubrifiants: 4500 },
    stockActuel: { essence: 9000, gasoil: 11000, gpl: 1000, lubrifiants: 450 },
    nombrePompes: 7,
    gestionnaire: { nom: 'Amadou Baldé', telephone: '+224 621 00 04 02', email: 'amadou.balde@staroil.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-18', quantite: 25000, carburant: 'essence' }
  },

  // Kamsar Petroleum Stations
  {
    id: '11',
    nom: 'KP Lambanyi',
    code: 'KP-LAM-001',
    adresse: 'Quartier Lambanyi, Commune de Ratoma',
    ville: 'Conakry',
    region: 'Conakry',
    coordonnees: { lat: 9.6234, lng: -13.5901 },
    type: 'urbaine',
    entrepriseId: '5',
    entrepriseNom: 'Kamsar Petroleum',
    logo: logoKP,
    capacite: { essence: 80000, gasoil: 100000, gpl: 10000, lubrifiants: 4000 },
    stockActuel: { essence: 72000, gasoil: 90000, gpl: 9000, lubrifiants: 3600 },
    nombrePompes: 6,
    gestionnaire: { nom: 'Thierno Diallo', telephone: '+224 621 00 05 01', email: 'thierno.diallo@kamsarpetroleum.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-29', quantite: 30000, carburant: 'essence' }
  },
  {
    id: '12',
    nom: 'KP Sonfonia',
    code: 'KP-SON-001',
    adresse: 'Carrefour Sonfonia, Ratoma',
    ville: 'Conakry',
    region: 'Conakry',
    type: 'urbaine',
    entrepriseId: '5',
    entrepriseNom: 'Kamsar Petroleum',
    logo: logoKP,
    capacite: { essence: 70000, gasoil: 85000, gpl: 8000, lubrifiants: 3500 },
    stockActuel: { essence: 63000, gasoil: 76500, gpl: 7200, lubrifiants: 3150 },
    nombrePompes: 5,
    gestionnaire: { nom: 'Mariame Sow', telephone: '+224 621 00 05 02', email: 'mariame.sow@kamsarpetroleum.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-28', quantite: 25000, carburant: 'gasoil' }
  },
  {
    id: '13',
    nom: 'KP Kamsar Port',
    code: 'KP-KAM-001',
    adresse: 'Zone Portuaire, Kamsar',
    ville: 'Kamsar',
    region: 'Boké',
    type: 'routiere',
    entrepriseId: '5',
    entrepriseNom: 'Kamsar Petroleum',
    logo: logoKP,
    capacite: { essence: 200000, gasoil: 250000, gpl: 25000, lubrifiants: 10000 },
    stockActuel: { essence: 180000, gasoil: 225000, gpl: 22500, lubrifiants: 9000 },
    nombrePompes: 14,
    gestionnaire: { nom: 'Ousmane Diaby', telephone: '+224 621 00 05 03', email: 'ousmane.diaby@kamsarpetroleum.gn' },
    statut: 'ouverte',
    derniereLivraison: { date: '2026-01-30', quantite: 60000, carburant: 'gasoil' }
  }
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'stock_critical',
    stationId: '5',
    stationNom: 'Shell Cosa',
    entrepriseNom: 'Shell',
    message: 'Stock essence critique à 6% - Rupture imminente',
    niveau: 'critique',
    dateCreation: '2026-01-31T08:30:00',
    resolu: false
  },
  {
    id: '2',
    type: 'stock_critical',
    stationId: '5',
    stationNom: 'Shell Cosa',
    entrepriseNom: 'Shell',
    message: 'Stock gasoil critique à 8% - Rupture imminente',
    niveau: 'critique',
    dateCreation: '2026-01-31T08:30:00',
    resolu: false
  },
  {
    id: '3',
    type: 'stock_warning',
    stationId: '2',
    stationNom: 'TotalEnergies Kaloum Centre',
    entrepriseNom: 'TotalEnergies',
    message: 'Stock essence à 10% - Niveau d\'alerte atteint',
    niveau: 'alerte',
    dateCreation: '2026-01-31T07:15:00',
    resolu: false
  },
  {
    id: '4',
    type: 'stock_warning',
    stationId: '7',
    stationNom: 'TMI Kagbelen',
    entrepriseNom: 'TMI',
    message: 'Stock essence à 15% - Niveau d\'alerte atteint',
    niveau: 'alerte',
    dateCreation: '2026-01-31T09:00:00',
    resolu: false
  },
  {
    id: '5',
    type: 'stock_warning',
    stationId: '10',
    stationNom: 'Star Oil Matoto',
    entrepriseNom: 'Star Oil',
    message: 'Stock essence à 10% - Niveau d\'alerte atteint',
    niveau: 'alerte',
    dateCreation: '2026-01-31T09:30:00',
    resolu: false
  }
];

export const mockDashboardStats: DashboardStats = {
  totalEntreprises: 5,
  totalStations: 148,
  stationsActives: 142,
  alertesCritiques: 2,
  alertesWarning: 3,
  stockNationalEssence: 78,
  stockNationalGasoil: 85
};

export const regions = [
  'Conakry',
  'Kindia',
  'Boké',
  'Mamou',
  'Labé',
  'Faranah',
  'Kankan',
  'Nzérékoré'
];

export const prixOfficiels = {
  essence: 12000,
  gasoil: 12000,
  gpl: 8500,
  devise: 'GNF'
};

// Function to get enterprise logo by ID or sigle
export function getEnterpriseLogo(entrepriseId: string): string | undefined {
  // First try by ID
  const entreprise = mockEntreprises.find(e => e.id === entrepriseId);
  if (entreprise?.logo) return entreprise.logo;
  
  // If not found or no logo, return undefined - will fallback to initials
  return undefined;
}
