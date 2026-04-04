import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Fuel, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

export default function AccessDeniedPage() {
  const { role, user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <Card className="relative z-10 w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-primary to-red-500" />
        
        <CardContent className="pt-12 pb-8 px-8 text-center">
          <div className="relative mb-8 inline-block">
            <div className="h-24 w-24 bg-red-950/30 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <ShieldX className="h-12 w-12 text-red-500 animate-in zoom-in-50 duration-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase italic">
            <span className="text-red-500">Accès</span> <br/> 
            Interrompu
          </h1>
          
          <div className="bg-slate-950/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 mb-8 text-start">
            <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium">
              Votre habilitation actuelle ne vous permet pas d'accéder à ce secteur du système 
              <span className="text-primary font-bold"> SIHG</span>. Une autorisation spécifique est requise.
            </p>

            <div className="space-y-3 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Identité :</span>
                <span className="text-slate-200 font-mono">{user?.email || 'Inconnu'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Poste :</span>
                {role ? (
                  <span className="text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {ROLE_LABELS[role]}
                  </span>
                ) : (
                  <span className="text-amber-500 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 italic">
                    Aucun rôle assigné
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/" className="flex-1">
              <Button className="w-full h-12 gap-2 bg-white hover:bg-slate-200 text-black rounded-xl font-bold shadow-lg transition-all active:scale-95">
                <ArrowLeft className="h-4 w-4" />
                Retour au Terminal
              </Button>
            </Link>
            <Button variant="outline" className="h-12 border-slate-800 bg-transparent text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl font-bold" onClick={() => signOut()}>
              Se déconnecter
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600 font-bold tracking-widest uppercase italic">
            <Fuel className="h-3 w-3 opacity-50" />
            <span>Sécurité des Hydrocarbures de Guinée</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
