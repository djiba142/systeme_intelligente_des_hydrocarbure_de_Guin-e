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
  Briefcase,
  LogOut,
  Gauge,
  Award,
  ScrollText,
  Landmark
} from 'lucide-react';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
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
      { name: 'Dashboard DG & État', href: '/dashboard/admin-etat', icon: Shield, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin'] },
      { name: 'Entreprises Pétrolières', href: '/entreprises', icon: Building2, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin'] },
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin'] },
      { name: 'Rapports Stratégiques', href: '/rapports', icon: FileText, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin'] },
      { name: 'Alertes Énergétiques', href: '/alertes', icon: AlertTriangle, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin'] },
      { name: 'Carte Nationale', href: '/carte', icon: Map, roles: ['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'super_admin', 'inspecteur', 'admin_central', 'chef_regulation', 'analyste_regulation'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // ADMIN CENTRAL — RÉGULATION & QUOTAS
  // ═══════════════════════════════════════════════════════════
  {
    title: "Régulation & Quotas (Admin Central)",
    items: [
      { name: 'Dashboard Régulation', href: '/dashboard/admin-central', icon: Landmark, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Gestion des Quotas', href: '/regulation/quotas', icon: Gauge, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Agréments', href: '/regulation/agrements', icon: Award, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Licences', href: '/regulation/licences', icon: ScrollText, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Entreprises', href: '/entreprises', icon: Building2, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Carte Nationale', href: '/carte', icon: Map, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
      { name: 'Alertes & Décisions', href: '/alertes', icon: AlertTriangle, roles: ['admin_central', 'chef_regulation', 'analyste_regulation', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DSA — Direction des Services Aval
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Services Aval (DSA)",
    items: [
      { name: 'Dashboard DSA', href: '/dashboard/dsa', icon: Activity, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Cartographie', href: '/carte', icon: Map, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Livraisons', href: '/admin/commandes', icon: Truck, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Stocks Stations', href: '/stations', icon: Warehouse, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Alertes DSA', href: '/alertes', icon: AlertTriangle, roles: ['directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Supervision Terrain', href: '/agent-terrain', icon: HardHat, roles: ['chef_service_aval', 'agent_technique_aval', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // CORPS NATIONAL DES INSPECTEURS
  // ═══════════════════════════════════════════════════════════
  {
    title: "Corps National des Inspecteurs",
    items: [
      { name: 'Dashboard Inspection', href: '/dashboard/inspecteur', icon: Eye, roles: ['inspecteur', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction'] },
      { name: 'Agent de Terrain', href: '/agent-terrain', icon: HardHat, roles: ['inspecteur', 'super_admin'] },
      { name: 'Registre Inspections', href: '/inspections', icon: ClipboardList, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'inspecteur'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // SERVICE COURRIER & ACCUEIL
  // ═══════════════════════════════════════════════════════════
  {
    title: "Service Courrier & Accueil",
    items: [
      { name: 'Réception Dossiers', href: '/accueil/reception', icon: FileText, roles: ['agent_reception', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // GESTION DES DOSSIERS (WORKFLOW GLOBAL)
  // ═══════════════════════════════════════════════════════════
  {
    title: "Gestion des Dossiers",
    items: [
      { name: 'Registre des Dossiers', href: '/dossiers', icon: FolderOpen, roles: ['agent_reception', 'secretariat_direction', 'directeur_aval', 'chef_service_aval', 'agent_technique_aval', 'directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire', 'directeur_juridique', 'juriste', 'charge_conformite', 'directeur_general', 'directeur_adjoint', 'admin_central', 'super_admin'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // DIRECTION IMPORTATION & APPROVISIONNEMENT
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Importation & Approvisionnement",
    items: [
      { name: 'Dashboard Import', href: '/dashboard/importation', icon: LayoutDashboard, roles: ['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat'] },
      { name: 'Réception Port', href: '/importations/port-reception', icon: Anchor, roles: ['agent_reception_port', 'chef_service_importation', 'super_admin'] },
      { name: 'Contrôle Qualité', href: '/importations/quality-control', icon: ClipboardCheck, roles: ['inspecteur', 'agent_technique_aval', 'super_admin'] },
      { name: 'Fournisseurs', href: '/importations/fournisseurs', icon: Users, roles: ['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin'] },
      { name: 'Produits Pétroliers', href: '/importations/produits', icon: Droplets, roles: ['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin'] },
      { name: 'Navires & Cargaisons', href: '/importations/navires', icon: Ship, roles: ['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Dossiers Import', href: '/importations/dossiers', icon: FolderOpen, roles: ['directeur_importation', 'chef_service_importation', 'agent_suivi_cargaison', 'analyste_approvisionnement', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DIRECTION ADMINISTRATIVE
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Administrative",
    items: [
      { name: 'Dashboard Admin', href: '/dashboard/administratif', icon: LayoutDashboard, roles: ['directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire', 'super_admin'] },
      { name: 'Entreprises Pétrolières', href: '/entreprises', icon: Building2, roles: ['directeur_administratif', 'chef_service_administratif', 'super_admin'] },
      { name: 'Dossiers & Agréments', href: '/dossiers', icon: FolderOpen, roles: ['directeur_administratif', 'chef_service_administratif', 'gestionnaire_documentaire', 'secretariat_direction', 'directeur_juridique', 'juriste', 'charge_conformite', 'directeur_aval', 'directeur_general', 'directeur_adjoint', 'super_admin'] },
      { name: 'Gestion Documentaire', href: '/juridique/archives', icon: FileText, roles: ['directeur_administratif', 'gestionnaire_documentaire', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DIRECTION LOGISTIQUE
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Logistique",
    items: [
      { name: 'Dashboard Logistique', href: '/dashboard/logistique', icon: LayoutDashboard, roles: ['directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique', 'super_admin', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Gestion des Dépôts', href: '/logistique/depots', icon: Warehouse, roles: ['directeur_logistique', 'responsable_depots', 'super_admin', 'directeur_general'] },
      { name: 'Transport & Flotte', href: '/logistique/transport', icon: Truck, roles: ['directeur_logistique', 'responsable_transport', 'super_admin'] },
      { name: 'Planning Distribution', href: '/logistique/planning', icon: ClipboardList, roles: ['directeur_logistique', 'agent_logistique', 'super_admin'] },
      { name: 'Réceptions Flux', href: '/logistique/receptions', icon: Package, roles: ['directeur_logistique', 'agent_logistique', 'operateur_logistique', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DIRECTION JURIDIQUE & CONFORMITÉ
  // ═══════════════════════════════════════════════════════════
  {
    title: "Direction Juridique & Conformité",
    items: [
      { name: 'Dashboard DJ/C', href: '/dashboard/juridique', icon: Scale, roles: ['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Dossiers & Workflow', href: '/dossiers', icon: FolderOpen, roles: ['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin', 'secretariat_direction', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Gestion des Contrats', href: '/juridique/contrats', icon: FileText, roles: ['directeur_juridique', 'juriste', 'super_admin'] },
      { name: 'Conformité & Contrôle', href: '/juridique/conformite', icon: ShieldCheck, roles: ['directeur_juridique', 'charge_conformite', 'super_admin'] },
      { name: 'Contentieux & Litiges', href: '/juridique/litiges', icon: Gavel, roles: ['directeur_juridique', 'juriste', 'super_admin'] },
      { name: 'Archives & Documents', href: '/juridique/archives', icon: HistoryIcon, roles: ['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // GESTION DES OPÉRATIONS — Partagé
  // ═══════════════════════════════════════════════════════════
  {
    title: "Gestion des Opérations",
    items: [
      { name: 'Stations-Service', href: '/stations', icon: Fuel, roles: ['super_admin', 'directeur_aval', 'chef_service_aval', 'agent_technique_aval'] },
      { name: 'Alertes & Risques', href: '/alertes', icon: AlertTriangle, roles: ['super_admin', 'directeur_aval', 'chef_service_aval', 'agent_technique_aval'] },
      { name: 'Pilotage & Données', href: '/rapports', icon: BarChart3, roles: ['super_admin', 'directeur_aval', 'chef_service_aval', 'agent_technique_aval'] },
      { name: 'Entreprises', href: '/entreprises', icon: Building2, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_importation', 'directeur_administratif', 'directeur_logistique'] },
      { name: 'Importations', href: '/importations', icon: Ship, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_importation', 'agent_suivi_cargaison'] },
      { name: 'Commandes Flux', href: '/admin/commandes', icon: Truck, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'directeur_aval', 'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport'] },
      { name: 'Réception Produits', href: '/station/reception', icon: ClipboardCheck, roles: ['gestionnaire_station', 'super_admin'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // PILOTAGE & DONNÉES
  // ═══════════════════════════════════════════════════════════
  {
    title: "Rapports & Stats",
    items: [
      { name: 'Rapports & Statistiques', href: '/rapports', icon: FileText, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_service_aval', 'agent_technique_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'inspecteur', 'service_it', 'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'directeur_importation', 'agent_suivi_cargaison', 'directeur_administratif', 'directeur_logistique'] },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // DSI — ADMINISTRATION SIHG
  // ═══════════════════════════════════════════════════════════
  {
    title: "Administration SIHG (DSI)",
    items: [
      { name: 'Console DSI', href: '/dashboard/service-it', icon: Terminal, roles: ['service_it', 'super_admin'] },
      { name: 'Gestion Utilisateurs', href: '/utilisateurs', icon: Users, roles: ['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretariat_direction', 'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'directeur_juridique', 'directeur_importation', 'directeur_administratif', 'directeur_logistique'] },
      { name: 'Journaux d\'Audit', href: '/audit', icon: Shield, roles: ['super_admin', 'service_it', 'directeur_general', 'directeur_adjoint'] },
      { name: 'Sécurité Informatique', href: '/audit', icon: ShieldCheck, roles: ['super_admin', 'service_it'] },
      { name: 'Paramètres Système', href: '/parametres', icon: Settings, roles: ['super_admin'] },
    ]
  }
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();


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

      {/* User Profile Footer */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/30">
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "justify-center" : ""
        )}>
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 flex-shrink-0">
            {profile?.full_name?.substring(0, 1) || 'D'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-sidebar-foreground truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-[10px] font-bold text-sidebar-foreground/50 uppercase truncate">
                {role?.replace(/_/g, ' ') || 'Chargement...'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={() => signOut()}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button 
            onClick={() => signOut()}
            className="mt-3 w-8 h-8 mx-auto flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

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

