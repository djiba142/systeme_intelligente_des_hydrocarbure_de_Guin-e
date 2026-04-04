import { User, ChevronDown, LogOut, Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { profile, role, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="sticky top-0 z-30 w-full">
      {/* Guinea National Flag Strip */}
      <div className="flex w-full h-1">
        <div className="w-1/3 h-full bg-[#CE1126]" /> 
        <div className="w-1/3 h-full bg-[#FCD116]" /> 
        <div className="w-1/3 h-full bg-[#00944D]" /> 
      </div>
      <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-sm font-black text-foreground uppercase tracking-wider">{title}</h1>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="w-64 pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(profile?.full_name || user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium">
                  {profile?.full_name || 'Utilisateur'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role ? ROLE_LABELS[role] : 'Non assigné'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profil')} className="cursor-pointer">
              <UserCircle className="h-4 w-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/parametres')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Préférences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              Mode {theme === 'dark' ? 'Clair' : 'Sombre'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </div>
  );
}
