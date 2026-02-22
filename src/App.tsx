// SIHG v1.0.0 - Système Intégré des Hydrocarbures de Guinée
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
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

// Lazy load dashboards
const DashboardEntreprise = lazy(() => import("./pages/dashboards/DashboardEntreprise"));
const DashboardSuperAdmin = lazy(() => import("./pages/dashboards/DashboardSuperAdmin"));

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

            {/* DASHBOARDS STIRCTS - CHAQUE ROLE A LE SIEN */}
            <Route path="/panel" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              {/* Redirection intelligente gérée par le composant Index ou AuthContext */}
              <Route index element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
            </Route>

            <Route path="/dashboard/admin" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardSuperAdmin /></Suspense>} />
            </Route>

            <Route path="/dashboard/entreprise" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardEntreprise /></Suspense>} />
            </Route>


            {/* FONCTIONNALITÉS PARTAGÉES MAIS RESTREINTES */}

            {/* Carte : Tout le monde */}
            <Route path="/carte" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><CartePage /></Suspense>} />
            </Route>

            {/* Entreprises : Admin seulemnent */}
            <Route path="/entreprises" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><EntreprisesPage /></Suspense>} />
            </Route>

            <Route path="/entreprises/:id" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><EntrepriseDetailPage /></Suspense>} />
            </Route>

            {/* Stations : Tout le monde a un accès, mais la vue changera selon le rôle */}
            <Route path="/stations" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><StationsPage /></Suspense>} />
            </Route>

            <Route path="/stations/:id" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>} />
            </Route>

            {/* Alertes : Tout le monde */}
            <Route path="/alertes" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><AlertesPage /></Suspense>} />
            </Route>

            {/* Rapports : Admin, Entreprise */}
            <Route path="/rapports" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><RapportsPage /></Suspense>} />
            </Route>

            {/* ADMINISTRATION SYSTEME - STRICTEMENT SUPER ADMIN */}
            <Route path="/utilisateurs" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin', 'responsable_entreprise']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><UtilisateursPage /></Suspense>} />
            </Route>

            <Route path="/admin/commandes" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin']} />
              </ProtectedRoute>
            }>
              <Route index element={<OrdersPage />} />
            </Route>

            <Route path="/parametres" element={
              <ProtectedRoute>
                <RequireRole allowedRoles={['super_admin']} />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><ParametresPage /></Suspense>} />
            </Route>

            {/* PAGES COMMUNES */}
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

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary >
);

export default App;
