import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Building2,
  Fuel,
  AlertTriangle,
  FileText,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Map,
  Ship,
  Truck,
  Info,
  Shield,
  ClipboardCheck,
  Eye,
  BarChart3,
  FolderOpen,
  Terminal,
  Moon,
  Sun,
  Activity,
  ClipboardList,
  Scale,
  ShieldCheck,
  Wallet,
  Coins,
  Receipt,
  PiggyBank,
  Contact2,
  Anchor,
  Warehouse,
  Package,
  HardHat,
  Gavel,
  Droplets,
  History as HistoryIcon,
  Briefcase
} from 'lucide-react';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import { cn } from '@/lib/utils';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  // ═══════════════════════════════════════════════════════════
  {
    title: "Régulation — État de Guinée",
    items: [
      { name: 'Dashboard National', href: '/dashboard/admin-etat', icon: Shield, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Entreprises Pétrolières', href: '/entreprises', icon: Building2, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Rapports Stratégiques', href: '/rapports', icon: FileText, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Statistiques Nationales', href: '/statistiques', icon: BarChart3, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Alertes Énergétiques', href: '/alertes', icon: AlertTriangle, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin'] },
      { name: 'Carte Nationale', href: '/carte', icon: Map, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin', 'inspecteur'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DSA — Direction des Services Aval
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Services Aval (DSA)",
    items: [
      { name: 'Dashboard DSA', href: '/dashboard/dsa', icon: Activity, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'super_admin'] },
      { name: 'Cartographie', href: '/carte', icon: Map, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'technicien_flux', 'super_admin'] },
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'super_admin'] },
      { name: 'entreprises', href: '/entreprises', icon: Building2, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'super_admin'] },
      { name: 'Produits Pétroliers', href: '/importations/produits', icon: Droplets, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'technicien_flux', 'super_admin'] },
      { name: 'Quotas Distribution', href: '/quotas', icon: Scale, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'controleur_distribution', 'super_admin'] },
      { name: 'Livraisons', href: '/admin/commandes', icon: Truck, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'technicien_flux', 'super_admin'] },
      { name: 'Stocks Stations', href: '/stations', icon: Warehouse, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'technicien_flux', 'super_admin'] },
      { name: 'Alertes DSA', href: '/alertes', icon: AlertTriangle, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'super_admin'] },
      { name: 'Supervision Terrain', href: '/agent-terrain', icon: HardHat, roles: ['chef_bureau_aval', 'agent_supervision_aval', 'super_admin'] },
      { name: 'Rapports Aval', href: '/rapports', icon: BarChart3, roles: ['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'super_admin'] },
      { name: 'Utilisateurs DSA', href: '/utilisateurs', icon: Users, roles: ['directeur_aval', 'directeur_adjoint_aval', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // CORPS NATIONAL DES INSPECTEURS
  // ═══════════════════════════════════════════════════════════
  {
    title: "Corps National des Inspecteurs",
    items: [
      { name: 'Dashboard Inspection', href: '/dashboard/inspecteur', icon: Eye, roles: ['inspecteur', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general'] },
      { name: 'Agent de Terrain', href: '/agent-terrain', icon: HardHat, roles: ['inspecteur', 'super_admin'] },
      { name: 'Registre Inspections', href: '/inspections', icon: ClipboardList, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'inspecteur'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // DIRECTION IMPORTATION & APPROVISIONNEMENT
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Importation & Approvisionnement",
    items: [
      { name: 'Dashboard Import', href: '/dashboard/importation', icon: LayoutDashboard, roles: ['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat'] },
      { name: 'Fournisseurs', href: '/importations/fournisseurs', icon: Users, roles: ['directeur_importation', 'agent_importation', 'super_admin'] },
      { name: 'Produits Pétroliers', href: '/importations/produits', icon: Droplets, roles: ['directeur_importation', 'agent_importation', 'super_admin'] },
      { name: 'Navires', href: '/importations/navires', icon: Ship, roles: ['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Dossiers & Cargaisons', href: '/importations/dossiers', icon: FolderOpen, roles: ['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // MISSIONS TERRAIN (Entreprises Pétrolières)
  // ═══════════════════════════════════════════════════════════
  {
    title: "Portail Entreprises Pétrolières",
    items: [
      { name: 'Dashboard Entreprise', href: '/dashboard/entreprise', icon: Fuel, roles: ['responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'super_admin'] },
      { name: 'Mes Stations', href: '/stations', icon: Fuel, roles: ['responsable_entreprise', 'responsable_stations', 'super_admin'] },
      { name: 'Stocks Stations', href: '/stations', icon: Warehouse, roles: ['responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'super_admin'] },
      { name: 'Livraisons', href: '/admin/commandes', icon: Truck, roles: ['responsable_entreprise', 'gestionnaire_livraisons', 'operateur_entreprise', 'super_admin'] },
      { name: 'Camions Citernes', href: '/logistique/transport', icon: Truck, roles: ['responsable_entreprise', 'operateur_entreprise', 'gestionnaire_livraisons', 'super_admin'] },
      { name: 'Alertes Entreprise', href: '/alertes', icon: AlertTriangle, roles: ['responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'super_admin'] },
      { name: 'Rapports Entreprise', href: '/rapports', icon: FileText, roles: ['responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'super_admin', 'secretaire_general', 'directeur_general', 'directeur_adjoint'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // GESTION DES OPÉRATIONS — Partagé
  // ═══════════════════════════════════════════════════════════
  {
    title: "Gestion des Opérations",
    items: [
      { name: 'Entreprises', href: '/entreprises', icon: Building2, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'inspecteur', 'directeur_importation'] },
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'responsable_entreprise', 'responsable_stations', 'operateur_entreprise'] },
      { name: 'Importations', href: '/importations', icon: Ship, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'directeur_importation', 'agent_importation'] },
      { name: 'Commandes Flux', href: '/admin/commandes', icon: Truck, roles: ['admin_etat', 'super_admin', 'directeur_general', 'directeur_adjoint', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'responsable_entreprise', 'gestionnaire_livraisons', 'operateur_entreprise', 'inspecteur'] },
      { name: 'Alertes & Risques', href: '/alertes', icon: AlertTriangle, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // PILOTAGE & DONNÉES
  // ═══════════════════════════════════════════════════════════
  {
    title: "Pilotage & Données",
    items: [
      { name: 'Rapports & Stats', href: '/rapports', icon: FileText, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'operateur_entreprise', 'gestionnaire_livraisons', 'responsable_stations', 'inspecteur', 'responsable_entreprise', 'service_it', 'directeur_importation', 'agent_importation'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DSI — ADMINISTRATION SIHG
  // ═══════════════════════════════════════════════════════════
  {
    title: "Administration SIHG (DSI)",
    items: [
      { name: 'Console DSI', href: '/dashboard/service-it', icon: Terminal, roles: ['service_it', 'super_admin'] },
      { name: 'Gestion Utilisateurs', href: '/utilisateurs', icon: Users, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'responsable_entreprise', 'directeur_importation'] },
      { name: 'Journaux d\'Audit', href: '/audit', icon: Shield, roles: ['super_admin', 'service_it', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Sécurité Informatique', href: '/audit', icon: ShieldCheck, roles: ['super_admin', 'service_it'] },
      { name: 'Paramètres Système', href: '/parametres', icon: Settings, roles: ['super_admin'] },
    ]
  }
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [entrepriseLogo, setEntrepriseLogo] = useState<string | null>(null);
  const location = useLocation();
  const { role, profile } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fetchEntrepriseLogo = async () => {
      if (profile?.entreprise_id) {
        const { data } = await supabase
          .from('entreprises')
          .select('logo_url')
          .eq('id', profile.entreprise_id)
          .maybeSingle();

        if (data?.logo_url) {
          setEntrepriseLogo(data.logo_url);
        }
      }
    };

    fetchEntrepriseLogo();
  }, [profile?.entreprise_id]);

  // Filter categories and items based on role
  const filteredCategories = useMemo(() => {
    return navCategories.map(category => {
      // Service IT: only sees DSI & Infrastructure + Pilotage & Données
      if (role === 'service_it') {
        const allowedForIT = category.title.includes("DSI") || category.title.includes("Pilotage");
        if (!allowedForIT) {
          return { ...category, items: [] };
        }
      }

      return {
        ...category,
        items: category.items.filter(item => !item.roles || (role && item.roles.includes(role)))
      };
    }).filter(category => category.items.length > 0);
  }, [role]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo Section - Triple Logo System */}
      <div className="flex items-center h-24 px-4 border-b border-sidebar-border bg-gradient-to-b from-sidebar/80 to-sidebar/40 backdrop-blur-md">
        <div className={cn(
          "flex items-center gap-3 overflow-hidden transition-all duration-500",
          collapsed ? "justify-center w-full" : "w-auto"
        )}>
          <div className="flex -space-x-4 items-center group">
            {/* Nexus Logo */}
            <div className="h-11 w-11 p-1.5 bg-white rounded-xl shadow-lg border border-sidebar-border z-30 transform group-hover:-translate-x-1 transition-transform duration-300">
              <img src={logo} alt="Nexus" className="h-full w-full object-contain" />
            </div>
            {/* SONAP Logo */}
            <div className="h-11 w-11 p-1.5 bg-white rounded-xl shadow-lg border border-sidebar-border z-20 transform group-hover:translate-x-1 transition-transform duration-300">
              <img src={sonapLogo} alt="SONAP" className="h-full w-full object-contain" />
            </div>
            {/* Enterprise Logo (Conditional) */}
            {profile?.entreprise_id && (
              <div className="h-11 w-11 p-1.5 bg-white rounded-xl shadow-lg border border-primary/30 z-10 animate-in zoom-in-50 fade-in slide-in-from-left-8 duration-700 ml-2">
                {entrepriseLogo ? (
                  <img src={entrepriseLogo} alt="Entreprise" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full bg-slate-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="ml-1 flex flex-col justify-center animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="text-lg font-black text-sidebar-foreground tracking-tighter leading-none">
                SIHG
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                <p className="text-[8px] font-black text-sidebar-foreground/40 uppercase tracking-[0.2em]">National</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
        {filteredCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">
                {category.title}
              </p>
            )}

            {category.items.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && item.href !== '/dashboard/admin' && item.href !== '/dashboard/admin-etat' && location.pathname.startsWith(item.href));

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "nav-link group relative",
                    isActive && "active"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-all duration-300",
                    isActive ? "text-sidebar-primary-foreground scale-110" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )} />
                  {!collapsed && (
                    <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">{item.name}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="absolute right-0 h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse button only */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all duration-300"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span className="ml-2 text-sm font-bold uppercase tracking-widest opacity-60">Réduire</span>}
        </button>
      </div>
    </aside>
  );
}

