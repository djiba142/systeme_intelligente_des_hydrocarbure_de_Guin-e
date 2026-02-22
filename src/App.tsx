// SIHG v2.0.0 - Système Intégré des Hydrocarbures de Guinée
// Multi-Rôle: Super Admin, Admin État, Inspecteur, Analyste, Personnel Admin, Service IT, Resp. Entreprise
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireRole } from "@/components/RequireRole";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

// Eager load critical pages (public pages)
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFound from "./pages/NotFound";
import OrdersPage from "./pages/admin/OrdersPage";

// Lazy load non-critical pages (protected pages)
const Index = lazy(() => import("./pages/Index"));
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
const DashboardEntreprise = lazy(() => import("./pages/dashboards/DashboardEntreprise"));
const DashboardSuperAdmin = lazy(() => import("./pages/dashboards/DashboardSuperAdmin"));
const DashboardInspecteur = lazy(() => import("./pages/dashboards/DashboardInspecteur"));
const DashboardAnalyste = lazy(() => import("./pages/dashboards/DashboardAnalyste"));
const DashboardPersonnelAdmin = lazy(() => import("./pages/dashboards/DashboardPersonnelAdmin"));
const DashboardServiceIT = lazy(() => import("./pages/dashboards/DashboardServiceIT"));

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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes - eager loaded */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/acces-refuse" element={<AccessDeniedPage />} />

              {/* ═══════════════════════════════════════════════ */}
              {/* DASHBOARDS - CHAQUE RÔLE A LE SIEN             */}
              {/* ═══════════════════════════════════════════════ */}

              {/* Panel: Redirection intelligente vers le bon dashboard */}
              <Route path="/panel" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'personnel_admin', 'service_it', 'responsable_entreprise', 'gestionnaire_station']} />
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

              {/* Dashboard Inspecteur / Superviseur État */}
              <Route path="/dashboard/inspecteur" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['inspecteur', 'admin_etat', 'super_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardInspecteur /></Suspense>} />
              </Route>

              {/* Dashboard Analyste */}
              <Route path="/dashboard/analyste" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['analyste', 'super_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardAnalyste /></Suspense>} />
              </Route>

              {/* Dashboard Personnel Admin SONAP */}
              <Route path="/dashboard/personnel-admin" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['personnel_admin', 'super_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardPersonnelAdmin /></Suspense>} />
              </Route>

              {/* Dashboard Service IT */}
              <Route path="/dashboard/service-it" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['service_it', 'super_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardServiceIT /></Suspense>} />
              </Route>

              {/* Dashboard Entreprise */}
              <Route path="/dashboard/entreprise" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['responsable_entreprise', 'gestionnaire_station']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardEntreprise /></Suspense>} />
              </Route>

              {/* ═══════════════════════════════════════════════ */}
              {/* FONCTIONNALITÉS PARTAGÉES MAIS RESTREINTES      */}
              {/* ═══════════════════════════════════════════════ */}

              {/* Carte : Tous les rôles sauf service_it et personnel_admin */}
              <Route path="/carte" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><CartePage /></Suspense>} />
              </Route>

              {/* Entreprises : Admin + Inspecteur (lecture) + Analyste (lecture) + Personnel Admin */}
              <Route path="/entreprises" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'personnel_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><EntreprisesPage /></Suspense>} />
              </Route>

              <Route path="/entreprises/:id" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise', 'personnel_admin']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><EntrepriseDetailPage /></Suspense>} />
              </Route>

              {/* Stations : Tous sauf Service IT et Personnel Admin */}
              <Route path="/stations" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise', 'gestionnaire_station']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><StationsPage /></Suspense>} />
              </Route>

              <Route path="/stations/:id" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise', 'gestionnaire_station']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>} />
              </Route>

              {/* Alertes : Admin + Inspecteur + Analyste + Entreprise */}
              <Route path="/alertes" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><AlertesPage /></Suspense>} />
              </Route>

              {/* Rapports : Admin + Inspecteur + Analyste + Entreprise */}
              <Route path="/rapports" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise']} />
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
                  <RequireRole allowedRoles={['super_admin', 'service_it']} />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageLoader />}><UtilisateursPage /></Suspense>} />
              </Route>

              {/* Commandes : Super Admin uniquement */}
              <Route path="/admin/commandes" element={
                <ProtectedRoute>
                  <RequireRole allowedRoles={['super_admin']} />
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
                  <RequireRole allowedRoles={['super_admin', 'service_it']} />
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
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
