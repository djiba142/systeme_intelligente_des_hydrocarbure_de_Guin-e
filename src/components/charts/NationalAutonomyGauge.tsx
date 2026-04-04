import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NationalAutonomyGaugeProps {
  daysRemaining: number;
  fuelType: 'essence' | 'gasoil';
  maxDays?: number;
}

export function NationalAutonomyGauge({ 
  daysRemaining, 
  fuelType, 
  maxDays = 30 
}: NationalAutonomyGaugeProps) {
  const percentage = Math.min((daysRemaining / maxDays) * 100, 100);
  
  const getStatus = () => {
    if (daysRemaining < 7) return 'critical';
    if (daysRemaining < 14) return 'warning';
    return 'healthy';
  };
  
  const status = getStatus();
  
  const colors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    healthy: '#22c55e',
  };
  
  const bgColors = {
    critical: '#fef2f2',
    warning: '#fffbeb',
    healthy: '#f0fdf4',
  };
  
  const data = [
    { name: 'remaining', value: percentage },
    { name: 'empty', value: 100 - percentage },
  ];

  return (
    <div className={cn(
      "stat-card relative overflow-hidden",
      status === 'critical' && "border-red-200 bg-red-50/50",
      status === 'warning' && "border-amber-200 bg-amber-50/50"
    )}>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={42}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                <Cell fill={colors[status]} />
                <Cell fill={bgColors[status]} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold" style={{ color: colors[status] }}>
              {daysRemaining}j
            </span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {status === 'critical' ? (
              <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
            ) : status === 'warning' ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <h4 className="font-semibold text-sm">
              {fuelType === 'essence' ? 'Essence' : 'Gasoil'}
            </h4>
          </div>
          <p className="text-2xl font-bold font-display">
            {daysRemaining} jours
          </p>
          <p className="text-xs text-muted-foreground">
            d'autonomie nationale
          </p>
          
          {status === 'critical' && (
            <p className="text-xs text-red-600 font-medium mt-1">
              ⚠️ Commande urgente requise
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
