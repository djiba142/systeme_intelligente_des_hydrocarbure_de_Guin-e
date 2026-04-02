// SIHG v2.0.0 - Système Intégré des Hydrocarbures de Guinée
// Multi-Rôle: Super Admin, Admin État, Inspecteur, Analyste, Personnel Admin, Service IT, Resp. Entreprise
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppRole } from '@/types/roles';
import { SessionLockOverlay } from "./components/auth/SessionLockOverlay";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireRole } from "./components/RequireRole";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SessionTimeout } from "./components/auth/SessionTimeout";

// Eager load critical pages (public pages)
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFound from "./pages/NotFound";
import OrdersPage from "./pages/admin/OrdersPage";
import Index from "./pages/Index"; // Moved from lazy to eager load
import IpDeniedPage from "./pages/IpDeniedPage";

// Lazy load non-critical pages (protected pages)
const EntreprisesPage = lazy(() => import("./pages/EntreprisesPage"));
const EntrepriseDetailPage = lazy(() => import("./pages/EntrepriseDetailPage"));
const StationsPage = lazy(() => import("./pages/StationsPage"));
const StationDetailPage = lazy(() => import("./pages/StationDetailPage"));
const AlertesPage = lazy(() => import("./pages/AlertesPage"));
const UtilisateursPage = lazy(() => import("./pages/UtilisateursPage"));
const RapportsPage = lazy(() => import("./pages/RapportsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const EntrepriseInfoPage = lazy(() => import("./pages/EntrepriseInfoPage"));
const ParametresPage = lazy(() => import("./pages/ParametresPage"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const CartePage = lazy(() => import("./pages/CartePage"));
const ImportationsPage = lazy(() => import("./pages/ImportationsPage"));
const InspectionsPage = lazy(() => import("./pages/InspectionsPage"));
const AgentTerrainPage = lazy(() => import("./pages/AgentTerrainPage"));
const AProposPage = lazy(() => import("./pages/AProposPage"));

// Legal pages
const MentionsLegalesPage = lazy(() => import("./pages/legal/MentionsLegalesPage"));
const ConfidentialitePage = lazy(() => import("./pages/legal/ConfidentialitePage"));
const CGUPage = lazy(() => import("./pages/legal/CGUPage"));
const CookiesPage = lazy(() => import("./pages/legal/CookiesPage"));

// Resources pages
const DocumentationPage = lazy(() => import("./pages/resources/DocumentationPage"));
const FAQPage = lazy(() => import("./pages/resources/FAQPage"));
const GuidePage = lazy(() => import("./pages/resources/GuidePage"));
const SoutienPage = lazy(() => import("./pages/resources/SoutienPage"));

// Lazy load dashboards - Un par rôle
const DashboardSuperAdmin = lazy(() => import("@/pages/dashboards/DashboardSuperAdmin"));
const DashboardAdminEtat = lazy(() => import("@/pages/dashboards/DashboardAdminEtat"));
const DashboardAdminCentral = lazy(() => import("@/pages/dashboards/DashboardAdminCentral"));
const DashboardInspecteur = lazy(() => import("@/pages/dashboards/DashboardInspecteur"));
const DashboardServiceIT = lazy(() => import("@/pages/dashboards/DashboardServiceIT"));
import DashboardDSA from "@/pages/dashboards/DashboardDSA";
const DashboardAdministratif = lazy(() => import("@/pages/dashboards/DashboardAdministratif"));
const DashboardLogistique = lazy(() => import("@/pages/dashboards/DashboardLogistique"));

// Regulation Modules
const QuotasPage = lazy(() => import("./pages/regulation/QuotasPage"));
const AgrementsPage = lazy(() => import("./pages/regulation/AgrementsPage"));
const LicencesPage = lazy(() => import("./pages/regulation/LicencesPage"));

const DashboardJuridique = lazy(() => import("@/pages/dashboards/DashboardJuridique"));
const DashboardImportation = lazy(() => import("./pages/dashboards/DashboardImportation"));




// Importation Pages
const ImportFournisseursPage = lazy(() => import("@/pages/import/ImportFournisseursPage"));
const ImportDossiersPage = lazy(() => import("./pages/import/ImportDossiersPage"));
const ImportNaviresPage = lazy(() => import("./pages/import/ImportNaviresPage"));
const ImportProduitsPage = lazy(() => import("./pages/import/ImportProduitsPage"));
const ImportPortReceptionPage = lazy(() => import("./pages/import/ImportPortReceptionPage"));
const ImportQualityControlPage = lazy(() => import("./pages/import/ImportQualityControlPage"));

// Juridique Pages
const JuridiqueDossiersPage = lazy(() => import("./pages/juridique/DossiersPage"));
const JuridiqueContratsPage = lazy(() => import("./pages/juridique/ContratsPage"));
const JuridiqueConformitePage = lazy(() => import("./pages/juridique/ConformitePage"));
const JuridiqueLitigesPage = lazy(() => import("./pages/juridique/LitigesPage"));
const JuridiqueArchivesPage = lazy(() => import("./pages/juridique/ArchivesPage"));

// Logistique Pages
const LogistiqueDepotsPage = lazy(() => import("@/pages/logistique/LogistiqueDepotsPage"));
const LogistiqueReceptionsPage = lazy(() => import("@/pages/logistique/LogistiqueReceptionsPage"));
const LogistiqueTransportPage = lazy(() => import("@/pages/logistique/LogistiqueTransportPage"));
const LogistiquePlanningPage = lazy(() => import("@/pages/logistique/LogistiquePlanningPage"));
const AdminDossiersPage = lazy(() => import("@/pages/AdminDossiersPage"));
import DashboardReception from "@/pages/dashboards/DashboardReception";

// Dossiers Lifecycle Management
const DossiersListPage = lazy(() => import("./pages/dossiers/DossiersListPage"));
const DossierDetailPage = lazy(() => import("./pages/dossiers/DossierDetailPage"));
const StationReceptionPage = lazy(() => import("./pages/station/StationReceptionPage"));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

import { ThemeProvider } from "@/components/ThemeProvider";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="sihg-ui-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SessionTimeout />
              <SessionLockOverlay />
              <Routes>
                {/* Public routes - eager loaded */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Inspections: Admin + Inspecteur */}
                <Route path="/inspections" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval', 'inspecteur']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><InspectionsPage /></Suspense>} />
                </Route>
                <Route path="/agent-terrain" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'inspecteur', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AgentTerrainPage /></Suspense>} />
                </Route>
                <Route path="/acces-refuse" element={<AccessDeniedPage />} />
                <Route path="/ip-denied" element={<IpDeniedPage />} />

                {/* ═══════════════════════════════════════════════ */}
                {/* DASHBOARDS - CHAQUE RÔLE A LE SIEN             */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Panel: Redirection intelligente vers le bon dashboard */}
                <Route path="/panel" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={[
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'inspecteur',
                      'admin_central', 'chef_regulation', 'analyste_regulation',
                      'service_it', 
                      'secretariat_direction',
                      'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
                      'directeur_importation', 'agent_suivi_cargaison', 
                      'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire',
                      'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique',
                      'agent_reception', 'analyste', 'responsable_entreprise', 'gestionnaire_station', 'superviseur_aval', 'personnel_admin', 'directeur_financier', 'gestionnaire', 'technicien_aval'
                    ]} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
                </Route>

                {/* Dashboard Super Admin */}
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardSuperAdmin /></Suspense>} />
                </Route>

                {/* Dashboard Administrateur État (SONAP) */}
                <Route path="/dashboard/admin-etat" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAdminEtat /></Suspense>} />
                </Route>

                {/* Dashboard DSA (Direction des Services Aval) */}
                <Route path="/dashboard/dsa" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'super_admin', 'directeur_general', 'directeur_adjoint', 'secretariat_direction', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<DashboardDSA />} />
                </Route>

                {/* Dashboard Admin Central / Régulation */}
                <Route path="/dashboard/admin-central" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAdminCentral /></Suspense>} />
                </Route>

                {/* Module Régulation — Quotas */}
                <Route path="/regulation/quotas" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><QuotasPage /></Suspense>} />
                </Route>

                {/* Module Régulation — Agréments */}
                <Route path="/regulation/agrements" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AgrementsPage /></Suspense>} />
                </Route>

                {/* Module Régulation — Licences */}
                <Route path="/regulation/licences" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LicencesPage /></Suspense>} />
                </Route>

                {/* Dashboard Inspecteur */}
                <Route path="/dashboard/inspecteur" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['inspecteur', 'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'secretariat_direction']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardInspecteur /></Suspense>} />
                </Route>

                {/* Dashboard Juridique & Conformité */}
                <Route path="/dashboard/juridique" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardJuridique /></Suspense>} />
                </Route>


                {/* Dashboard Importation */}
                <Route path="/dashboard/importation" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardImportation /></Suspense>} />
                </Route>

                {/* Dashboard Administratif */}
                <Route path="/dashboard/administratif" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire', 'super_admin', 'gestionnaire', 'personnel_admin', 'superviseur_aval']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAdministratif /></Suspense>} />
                </Route>

                {/* Legacy redirect: old URL → new unified Dossiers route */}
                <Route path="/administratif/dossiers" element={<Navigate to="/dossiers" replace />} />

                {/* Dashboard Logistique */}
                <Route path="/dashboard/logistique" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardLogistique /></Suspense>} />
                </Route>


                {/* Module Réception (Service Courrier / Accueil) */}
                <Route path="/accueil/reception" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['agent_reception', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<DashboardReception />} />
                </Route>

                {/* --- WORKFLOW IMPORTATION (TRAÇABILITÉ) --- */}
                
                {/* 1. Réception Port (Arrivée Navire) */}
                <Route path="/importations/port-reception" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['agent_reception_port', 'chef_service_importation', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportPortReceptionPage /></Suspense>} />
                </Route>

                {/* 2. Contrôle Qualité */}
                <Route path="/importations/quality-control" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['inspecteur', 'agent_technique_aval', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportQualityControlPage /></Suspense>} />
                </Route>

                {/* Logistique Sub-Pages */}
                <Route path="/logistique/depots" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'responsable_depots', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueDepotsPage /></Suspense>} />
                </Route>

                <Route path="/logistique/transport" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'responsable_transport', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueTransportPage /></Suspense>} />
                </Route>

                <Route path="/logistique/receptions" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'agent_logistique', 'operateur_logistique', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueReceptionsPage /></Suspense>} />
                </Route>

                <Route path="/logistique/planning" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'agent_logistique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiquePlanningPage /></Suspense>} />
                </Route>

                <Route path="/station/reception" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['gestionnaire_station', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StationReceptionPage /></Suspense>} />
                </Route>

                <Route path="/importations/fournisseurs" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportFournisseursPage /></Suspense>} />
                </Route>

                <Route path="/importations/dossiers" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_suivi_cargaison', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'directeur_juridique', 'juriste']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportDossiersPage /></Suspense>} />
                </Route>

                <Route path="/importations/navires" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_suivi_cargaison', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'technicien_flux']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportNaviresPage /></Suspense>} />
                </Route>

                <Route path="/importations/produits" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_suivi_cargaison', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportProduitsPage /></Suspense>} />
                </Route>

                {/* Module Juridique & Conformité */}
                <Route path="/juridique/dossiers" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueDossiersPage /></Suspense>} />
                </Route>

                <Route path="/juridique/contrats" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueContratsPage /></Suspense>} />
                </Route>

                <Route path="/juridique/conformite" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'charge_conformite', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueConformitePage /></Suspense>} />
                </Route>

                <Route path="/juridique/litiges" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueLitigesPage /></Suspense>} />
                </Route>

                <Route path="/juridique/archives" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueArchivesPage /></Suspense>} />
                </Route>

                {/* Module de Gestion des Dossiers (Cycle de Vie Complet) */}
                <Route path="/dossiers" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}><DossiersListPage /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="/dossiers/:id" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}><DossierDetailPage /></Suspense>
                  </ProtectedRoute>
                } />


                {/* Dashboard Service IT */}
                <Route path="/dashboard/service-it" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['service_it', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardServiceIT /></Suspense>} />
                </Route>





                {/* ═══════════════════════════════════════════════ */}
                {/* FONCTIONNALITÉS PARTAGÉES MAIS RESTREINTES      */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Carte : Tous les rôles métier et stratégiques */}
                <Route path="/carte" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval', 'technicien_flux', 'inspecteur', 'analyste_regulation', 'directeur_importation', 'directeur_juridique']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><CartePage /></Suspense>} />
                </Route>

                {/* Entreprises : Admin + Inspecteur (lecture) + Analyste (lecture) + Personnel Admin + Directeurs */}
                <Route path="/entreprises" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'inspecteur', 'analyste_regulation', 'directeur_juridique', 'juriste', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><EntreprisesPage /></Suspense>} />
                </Route>

                <Route path="/entreprises/:id" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'inspecteur', 'analyste_regulation', 'directeur_juridique', 'juriste', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><EntrepriseDetailPage /></Suspense>} />
                </Route>

                {/* Stations : Tous sauf Service IT et Personnel Admin */}
                <Route path="/stations" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval', 'inspecteur', 'analyste_regulation', 'directeur_juridique']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StationsPage /></Suspense>} />
                </Route>

                <Route path="/stations/:id" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval', 'inspecteur', 'analyste_regulation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>} />
                </Route>

                {/* Alertes : Admin + Inspecteur + Analyste + Entreprise */}
                <Route path="/alertes" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'inspecteur', 'analyste_regulation', 'directeur_juridique', 'charge_conformite']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AlertesPage /></Suspense>} />
                </Route>

                {/* Importations: Admin + Analyste + Admin Etat + Direction Import */}
                <Route path="/importations" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'analyste_regulation', 'directeur_importation', 'agent_suivi_cargaison', 'directeur_juridique']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportationsPage /></Suspense>} />
                </Route>


                {/* Rapports : Admin + Inspecteur + Analyste + Entreprise */}
                <Route path="/rapports" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={[
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux',
                      'inspecteur', 'analyste_regulation',
                      'service_it',
                      'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
                      'directeur_importation', 'agent_suivi_cargaison'
                    ]} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><RapportsPage /></Suspense>} />
                </Route>


                {/* ═══════════════════════════════════════════════ */}
                {/* ADMINISTRATION SYSTÈME                          */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Utilisateurs : Super Admin + Service IT */}
                <Route path="/utilisateurs" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'directeur_juridique', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><UtilisateursPage /></Suspense>} />
                </Route>

                {/* Commandes : Admin État, DSA, Entreprise, Inspecteur, Analyste */}
                <Route path="/admin/commandes" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_general', 'directeur_adjoint', 'admin_etat', 'admin_central', 'secretariat_direction', 'super_admin', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'inspecteur', 'analyste_regulation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<OrdersPage />} />
                </Route>

                {/* Paramètres : Super Admin uniquement */}
                <Route path="/parametres" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ParametresPage /></Suspense>} />
                </Route>

                {/* Audit : Super Admin + Service IT */}
                <Route path="/audit" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AuditPage /></Suspense>} />
                </Route>

                {/* ═══════════════════════════════════════════════ */}
                {/* PAGES COMMUNES                                  */}
                {/* ═══════════════════════════════════════════════ */}

                <Route path="/profil" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <ProfilPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                <Route path="/a-propos" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <AProposPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                <Route path="/entreprise-info" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <EntrepriseInfoPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                {/* Pages légales (publiques) */}
                <Route path="/mentions-legales" element={<Suspense fallback={<PageLoader />}><MentionsLegalesPage /></Suspense>} />
                <Route path="/confidentialite" element={<Suspense fallback={<PageLoader />}><ConfidentialitePage /></Suspense>} />
                <Route path="/cgu" element={<Suspense fallback={<PageLoader />}><CGUPage /></Suspense>} />
                <Route path="/cookies" element={<Suspense fallback={<PageLoader />}><CookiesPage /></Suspense>} />

                {/* Pages ressources (publiques) */}
                <Route path="/documentation" element={<Suspense fallback={<PageLoader />}><DocumentationPage /></Suspense>} />
                <Route path="/faq" element={<Suspense fallback={<PageLoader />}><FAQPage /></Suspense>} />
                <Route path="/guide" element={<Suspense fallback={<PageLoader />}><GuidePage /></Suspense>} />
                <Route path="/soutien" element={<Suspense fallback={<PageLoader />}><SoutienPage /></Suspense>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
