import { ShieldAlert, ArrowLeft,Globe, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function IpDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-8 p-10 bg-white rounded-3xl shadow-2xl border border-red-100">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-25"></div>
          <div className="relative bg-red-50 rounded-full w-24 h-24 flex items-center justify-center">
            <ShieldAlert className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accès Restreint</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Votre adresse IP n'est pas autorisée à accéder au panel d'administration SIHG. 
            Cette mesure de sécurité protège les données stratégiques nationales.
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100 italic text-sm text-slate-600">
          <div className="flex items-center gap-3 justify-center">
             <Globe className="h-4 w-4 text-slate-400" />
             <span>Connexion hors réseau SONAP détectée</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
             <Mail className="h-4 w-4 text-slate-400" />
             <span>Contactez l'administrateur système pour autorisation</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/20 gap-2">
            <Link to="/auth">
              Retour à la connexion
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>

        <p className="text-[10px] uppercase font-black tracking-widest text-slate-300">
          Système Intelligent des Hydrocarbures de Guinée
        </p>
      </div>
    </div>
  );
}
