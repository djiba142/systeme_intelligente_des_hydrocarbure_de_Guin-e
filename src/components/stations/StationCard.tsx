import { MapPin, User, Clock, ChevronRight, Fuel, Scale } from 'lucide-react';
import { memo } from 'react';
import { Station } from '@/types';
import { StockIndicator, StockBadge } from '@/components/dashboard/StockIndicator';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface StationCardProps {
  station: Station;
}

const typeLabels = {
  urbaine: 'Urbaine',
  routiere: 'Routière',
  depot: 'Dépôt'
};

const statusStyles = {
  ouverte: 'bg-emerald-100 text-emerald-700',
  fermee: 'bg-red-100 text-red-700',
  en_travaux: 'bg-amber-100 text-amber-700',
  attente_validation: 'bg-blue-100 text-blue-700',
  validation_juridique: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  suspendu_legal: 'bg-red-500 text-white shadow-lg'
};

const statusLabels = {
  ouverte: 'Ouverte',
  fermee: 'Fermée',
  en_travaux: 'En travaux',
  attente_validation: 'En attente',
  validation_juridique: 'Certifié DJ/C',
  suspendu_legal: 'Blocage Légal'
};

function calculatePercentage(current: number, capacity: number): number {
  if (!capacity || capacity === 0) return 0;
  return Math.min(100, Math.round((current / capacity) * 100));
}

const StationCardComponent = ({ station }: StationCardProps) => {
  const essencePercent = calculatePercentage(station.stockActuel.essence, station.capacite.essence);
  const gasoilPercent = calculatePercentage(station.stockActuel.gasoil, station.capacite.gasoil);

  const hasCritical = essencePercent < 10 || gasoilPercent < 10;
  const hasWarning = !hasCritical && (essencePercent < 25 || gasoilPercent < 25);

  return (
    <Link
      to={`/stations/${station.id}`}
      className={cn(
        "block stat-card group transition-all duration-200",
        hasCritical && "border-red-200 hover:border-red-300 bg-red-50/30",
        hasWarning && !hasCritical && "border-amber-200 hover:border-amber-300 bg-amber-50/30",
        !hasCritical && !hasWarning && "hover:border-primary/30"
      )}
    >
      {/* Header: Nom + Statut + Logo entreprise */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {station.nom}
            </h3>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
              statusStyles[station.statut as keyof typeof statusStyles] || 'bg-gray-100 text-gray-700'
            )}>
              {station.statut === 'validation_juridique' && <Scale className="h-2.5 w-2.5 mr-1 inline-block" />}
              {statusLabels[station.statut as keyof typeof statusLabels] || station.statut}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
              {station.code}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {station.ville}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StockBadge percentage={Math.min(essencePercent, gasoilPercent)} />
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Logo + sigle de l'entreprise */}
      {(station.entrepriseLogo || station.entrepriseSigle || station.entrepriseNom) && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          {station.entrepriseLogo ? (
            <img
              src={station.entrepriseLogo}
              alt={station.entrepriseSigle || station.entrepriseNom}
              className="h-6 w-auto max-w-[48px] object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Fuel className="h-3 w-3 text-primary" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-700 truncate">
            {station.entrepriseSigle || station.entrepriseNom}
          </span>
        </div>
      )}

      {/* Stock Levels */}
      <div className="space-y-3 mb-4">
        <StockIndicator
          percentage={essencePercent}
          label="Essence"
          size="sm"
        />
        <StockIndicator
          percentage={gasoilPercent}
          label="Gasoil"
          size="sm"
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {station.gestionnaire.nom}
        </span>
        {station.derniereLivraison && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {new Date(station.derniereLivraison.date).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </Link>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
export const StationCard = memo(StationCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.station.id === nextProps.station.id &&
    prevProps.station.nom === nextProps.station.nom &&
    prevProps.station.statut === nextProps.station.statut &&
    prevProps.station.stockActuel.essence === nextProps.station.stockActuel.essence &&
    prevProps.station.stockActuel.gasoil === nextProps.station.stockActuel.gasoil &&
    prevProps.station.capacite.essence === nextProps.station.capacite.essence &&
    prevProps.station.capacite.gasoil === nextProps.station.capacite.gasoil &&
    prevProps.station.entrepriseLogo === nextProps.station.entrepriseLogo
  );
});
