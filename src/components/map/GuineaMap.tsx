import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '@/types';
import { StockIndicator } from '@/components/dashboard/StockIndicator';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, Satellite, Map as MapIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix pour les marqueurs par défaut de Leaflet qui disparaissent avec Webpack/Vite
// On désactive le linter pour cette ligne car on modifie le prototype d'une librairie externe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes de marqueurs personnalisés basés sur le niveau de stock
const createMarkerIcon = (level: 'critical' | 'warning' | 'healthy' | 'full') => {
  const colors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    healthy: '#22c55e',
    full: '#16a34a',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[level]};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function getStockLevel(percentage: number): 'critical' | 'warning' | 'healthy' | 'full' {
  if (percentage < 10) return 'critical';
  if (percentage < 25) return 'warning';
  if (percentage < 75) return 'healthy';
  return 'full';
}

interface GuineaMapProps {
  stations: Station[];
  height?: string;
  showControls?: boolean;
}

export function GuineaMap({ stations, height = "400px", showControls = true }: GuineaMapProps) {
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [mapKey, setMapKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  // Coordonnées du centre de la Guinée
  const guineaCenter: [number, number] = [10.0, -11.0];
  
  // Filtrer les stations avec coordonnées valides et informer TypeScript que coordonnees existe
  const stationsWithCoords = stations.filter(
    (s): s is Station & { coordonnees: { lat: number; lng: number } } => 
    !!s.coordonnees && typeof s.coordonnees.lat === 'number' && typeof s.coordonnees.lng === 'number'
  );
  
  // S'assurer qu'on est côté client (pour éviter les erreurs SSR avec Leaflet)
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSatelliteView = () => {
    setMapType('satellite');
    // Force le rechargement de la carte lors du changement de vue
    setMapKey(prev => prev + 1);
  };
  
  const handleStandardView = () => {
    setMapType('standard');
    setMapKey(prev => prev + 1);
  };
  
  if (!isClient) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted animate-pulse" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height }}>
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <Button
            size="sm"
            variant={mapType === 'standard' ? 'default' : 'outline'}
            onClick={handleStandardView}
            className="gap-1.5"
          >
            <MapIcon className="h-4 w-4" />
            Standard
          </Button>
          <Button
            size="sm"
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            onClick={handleSatelliteView}
            className="gap-1.5"
          >
            <Satellite className="h-4 w-4" />
            Satellite
          </Button>
        </div>
      )}
      
      <MapContainer
        key={mapKey}
        center={guineaCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={mapType === 'standard' 
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            : 'Tiles &copy; Esri'
          }
          url={mapType === 'standard'
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
        />
        
        {stationsWithCoords.map((station) => {
          const essencePercent = Math.round((station.stockActuel.essence / station.capacite.essence) * 100);
          const gasoilPercent = Math.round((station.stockActuel.gasoil / station.capacite.gasoil) * 100);
          const avgPercent = Math.round((essencePercent + gasoilPercent) / 2);
          const level = getStockLevel(avgPercent);
          
          return (
            <Marker
              key={station.id}
              // Plus besoin de "!" ici grâce au filtre typé plus haut
              position={[station.coordonnees.lat, station.coordonnees.lng]}
              icon={createMarkerIcon(level)}
            >
              <Popup className="station-popup">
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-1">{station.nom}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{station.entrepriseNom} • {station.ville}</p>
                  
                  <div className="space-y-2 mb-3">
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
                  
                  <Link to={`/stations/${station.id}`}>
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3" />
                      Voir détails
                    </Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
        <p className="text-xs font-medium mb-2">Niveau de stock</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Critique (&lt;10%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Alerte (&lt;25%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal (&gt;25%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}