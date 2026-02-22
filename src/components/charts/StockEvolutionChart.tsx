import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StockEvolutionChartProps {
  stationId?: string;
  entrepriseId?: string;
  title?: string;
}

// Generate mock historical data (deterministic using seed-like approach)
function generateMockData(days: number) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Deterministic "random" based on day index for stable renders
    const seed = (i * 2654435761) % 100;
    const baseEssence = 65 + (seed % 25);
    const baseGasoil = 70 + ((seed * 3) % 20);

    data.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      essence: Math.round(baseEssence + Math.sin(i * 0.5) * 10),
      gasoil: Math.round(baseGasoil + Math.cos(i * 0.5) * 8),
    });
  }

  return data;
}

export function StockEvolutionChart({ stationId, entrepriseId, title = "Évolution des Stocks" }: StockEvolutionChartProps) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Memoize data so it doesn't regenerate on every render
  const data = useMemo(() => generateMockData(period), [period]);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg font-display">{title}</h3>
          <p className="text-sm text-muted-foreground">Niveau de stock en pourcentage</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-1">
            <Button
              size="sm"
              variant={period === 7 ? 'default' : 'ghost'}
              onClick={() => setPeriod(7)}
              className="h-7 px-3 text-xs"
            >
              7 jours
            </Button>
            <Button
              size="sm"
              variant={period === 30 ? 'default' : 'ghost'}
              onClick={() => setPeriod(30)}
              className="h-7 px-3 text-xs"
            >
              30 jours
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="essenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gasoilGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="essence"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#essenceGradient)"
                name="Essence"
              />
              <Area
                type="monotone"
                dataKey="gasoil"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gasoilGradient)"
                name="Gasoil"
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="essence"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Essence"
              />
              <Line
                type="monotone"
                dataKey="gasoil"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Gasoil"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Moyenne Essence</p>
          <p className="text-lg font-bold text-amber-500">
            {Math.round(data.reduce((acc, d) => acc + d.essence, 0) / data.length)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Moyenne Gasoil</p>
          <p className="text-lg font-bold text-emerald-500">
            {Math.round(data.reduce((acc, d) => acc + d.gasoil, 0) / data.length)}%
          </p>
        </div>
      </div>
    </div>
  );
}
