import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

export const LandingNavbar = () => {
    const { user } = useAuth();

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center">
                        <Link to="/">
                            <img
                                src={logo}
                                alt="SIHG Logo"
                                className="h-20 w-auto"
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-semibold hover:text-[#f97316] transition-colors">Accueil</Link>
                        <Link to="/documentation" className="text-sm font-semibold hover:text-[#f97316] transition-colors">Documentation</Link>
                        <a href="#features" className="text-sm font-semibold hover:text-[#f97316] transition-colors">Fonctionnalités</a>
                        <a href="#services" className="text-sm font-semibold hover:text-[#f97316] transition-colors">Services</a>
                        <Link to="/support" className="text-sm font-semibold hover:text-[#f97316] transition-colors">Soutien</Link>
                        <Button className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-full px-8 shadow-lg shadow-blue-900/20" asChild>
                            <Link to={user ? "/panel" : "/auth"}>
                                {user ? "Tableau de bord" : "Se connecter"}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
