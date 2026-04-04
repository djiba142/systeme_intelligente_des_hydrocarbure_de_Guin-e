import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Fuel,
  Truck,
  X,
  BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: 'alert' | 'fuel' | 'truck' | 'info';
}

const iconMap = {
  alert: AlertCircle,
  fuel: Fuel,
  truck: Truck,
  info: Info,
  success: Check,
};

const typeStyles = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
};

const iconStyles = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  success: 'text-green-500',
};

export function NotificationCenter() {
  const { profile, role, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Fetch alerts from Supabase
      const [resAlerts, resNotifications] = await Promise.all([
        supabase
          .from('alertes')
          .select('*, station:stations(nom)')
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase.from('notifications' as any) as any)
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const alertsMapped: Notification[] = (resAlerts.data || []).map(a => ({
        id: a.id,
        type: a.niveau === 'critique' ? 'critical' : 'warning',
        title: a.niveau === 'critique' ? 'Rupture imminente' : 'Stock bas',
        message: `${a.station?.nom || 'Station'}: ${a.message}`,
        timestamp: parseISO(a.created_at),
        read: a.resolu || false,
        icon: a.type === 'stock_critical' ? 'alert' : 'fuel'
      }));

      const notificationsMapped: Notification[] = (resNotifications.data || []).map((n: any) => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        timestamp: parseISO(n.created_at),
        read: n.read || false,
        icon: n.type === 'success' ? 'success' : 'info'
      }));

      setNotifications([...notificationsMapped, ...alertsMapped].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

      // 2. AUTO-CHECK: Identify low stocks and create missing alerts
      // (Expanded role check to ensure monitoring users trigger alerts)
      const monitoringRoles = ['super_admin', 'service_it', 'admin_etat', 'inspecteur', 'analyste', 'directeur_administratif', 'directeur_logistique', 'responsable_depots'];
      if (role && monitoringRoles.includes(role)) {
        const { data: stations } = await supabase.from('stations').select('id, nom, stock_essence, capacite_essence, stock_gasoil, capacite_gasoil, entreprise_id');

        for (const station of (stations || [])) {
          const checkFuel = async (fuelType: 'essence' | 'gasoil') => {
            const stock = station[`stock_${fuelType}` as keyof typeof station] as number;
            const capacite = station[`capacite_${fuelType}` as keyof typeof station] as number;
            if (capacite > 0) {
              const percent = (stock / capacite) * 100;
              if (percent < 10) {
                // Check if an UNRESOLVED alert already exists for this station/fuel today
                const { count } = await supabase
                  .from('alertes')
                  .select('*', { count: 'exact', head: true })
                  .eq('station_id', station.id)
                  .eq('resolu', false)
                  .ilike('message', `%${fuelType}%`);

                if (count === 0) {
                  // AUTO-CREATE ALERT!
                  await supabase.from('alertes').insert({
                    station_id: station.id,
                    entreprise_id: station.entreprise_id,
                    type: percent < 5 ? 'stock_critical' : 'stock_warning',
                    niveau: percent < 5 ? 'critique' : 'alerte',
                    message: `Le niveau d'${fuelType} est à ${Math.round(percent)}% (${stock}L)`,
                    resolu: false
                  });
                }
              }
            }
          };

          await checkFuel('essence');
          await checkFuel('gasoil');
        }
      }
    } catch (err) {
      console.error('NotificationCenter error:', err);
    }
  }, [role]);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertes' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('alertes').update({ resolu: true }).eq('id', id);
      // State updated via realtime
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from('alertes').update({ resolu: true }).eq('resolu', false);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const removeNotification = async (id: string) => {
    // For this app, removing means marking as resolu or physically deleting
    // Let's just filter it out locally if we don't want to delete from DB
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-stock-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        typeStyles[notification.type]
                      )}>
                        <Icon className={cn("h-4 w-4", iconStyles[notification.type])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn(
                              "text-sm",
                              !notification.read && "font-medium"
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: fr
                          })}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Voir toutes les notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
