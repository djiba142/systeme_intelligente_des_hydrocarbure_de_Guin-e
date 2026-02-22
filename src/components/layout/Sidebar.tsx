import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  FileCheck,
  Eye,
  BarChart3,
  FolderOpen,
  Terminal,
  ClipboardList,
  Monitor
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import { useAuth, AppRole } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
  badge?: string | number;
}

const navigation: NavItem[] = [
  // Super Admin
  { name: 'Dashboard National', href: '/dashboard/admin', icon: LayoutDashboard, roles: ['super_admin'] },

  // Inspecteur / Admin État
  { name: 'Dashboard Inspecteur', href: '/dashboard/inspecteur', icon: Eye, roles: ['inspecteur', 'admin_etat'] },

  // Analyste
  { name: 'Dashboard Analyste', href: '/dashboard/analyste', icon: BarChart3, roles: ['analyste'] },

  // Personnel Admin
  { name: 'Espace Administratif', href: '/dashboard/personnel-admin', icon: FolderOpen, roles: ['personnel_admin'] },

  // Service IT
  { name: 'Console IT', href: '/dashboard/service-it', icon: Terminal, roles: ['service_it'] },

  // Partagé
  { name: 'Carte Nationale', href: '/carte', icon: Map, roles: ['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise'] },
  { name: 'Entreprises', href: '/entreprises', icon: Building2, roles: ['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'personnel_admin'] },
  { name: 'Stations', href: '/stations', icon: Fuel, roles: ['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise', 'gestionnaire_station'] },
  { name: 'Alertes', href: '/alertes', icon: AlertTriangle, roles: ['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise'] },
  { name: 'Commandes', href: '/admin/commandes', icon: Truck, roles: ['super_admin'] },
  { name: 'Rapports', href: '/rapports', icon: FileText, roles: ['super_admin', 'admin_etat', 'inspecteur', 'analyste', 'responsable_entreprise'] },
  { name: 'À Propos', href: '/a-propos', icon: Info }, // Visible to all
];

const dashboardNavigation: NavItem[] = [
  { name: 'Mon Entreprise', href: '/dashboard/entreprise', icon: Building2, roles: ['responsable_entreprise', 'gestionnaire_station'] },
];

const adminNavigation: NavItem[] = [
  { name: 'Utilisateurs', href: '/utilisateurs', icon: Users, roles: ['super_admin', 'service_it'] },
  { name: 'Audit', href: '/audit', icon: FileCheck, roles: ['super_admin', 'service_it'] },
  { name: 'Paramètres', href: '/parametres', icon: Settings, roles: ['super_admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role } = useAuth();

  // Filter navigation based on role
  const filterByRole = (items: NavItem[]) =>
    items.filter(item => !item.roles || (role && item.roles.includes(role)));

  const visibleMainNav = filterByRole(navigation);
  const visibleDashboardNav = filterByRole(dashboardNavigation);
  const visibleAdminNav = filterByRole(adminNavigation);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <img src={logo} alt="SIHG" className="h-10 w-10 object-contain flex-shrink-0 rounded-lg" />
        {!collapsed && (
          <div className="ml-3 animate-fade-in">
            <h1 className="text-sm font-bold text-sidebar-foreground">SIHG</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Système d'Information</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
        <div className="mb-2 px-3">
          {!collapsed && <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium">Principal</p>}
        </div>

        {visibleMainNav.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "nav-link group",
                isActive && "active"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
              )} />
              {!collapsed && (
                <span className="text-sm animate-fade-in">{item.name}</span>
              )}
              {item.badge && !collapsed && (
                <span className="ml-auto bg-stock-critical text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {visibleDashboardNav.length > 0 && (
          <>
            <div className="pt-6 mb-2 px-3">
              {!collapsed && <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium">Dashboards</p>}
            </div>

            {visibleDashboardNav.map((item) => {
              const isActive = location.pathname === item.href;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "nav-link group",
                    isActive && "active"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )} />
                  {!collapsed && (
                    <span className="text-sm animate-fade-in">{item.name}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        )}

        {visibleAdminNav.length > 0 && (
          <>
            <div className="pt-6 mb-2 px-3">
              {!collapsed && <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium">Administration</p>}
            </div>

            {visibleAdminNav.map((item) => {
              const isActive = location.pathname === item.href;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "nav-link group",
                    isActive && "active"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )} />
                  {!collapsed && (
                    <span className="text-sm animate-fade-in">{item.name}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
