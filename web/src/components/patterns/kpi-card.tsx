import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string;
  deltaPct?: number;
  sparkline?: number[];
  className?: string;
};

export function KpiCard({ label, value, deltaPct, sparkline = [], className }: KpiCardProps) {
  const up = deltaPct != null && deltaPct >= 0;
  const chartData = sparkline.map((v, i) => ({ i, v }));

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
          {deltaPct != null ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold tabular-nums',
                up ? 'text-success' : 'text-destructive',
              )}
            >
              {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(deltaPct).toFixed(1)}%
            </span>
          ) : null}
        </div>
        {chartData.length > 1 ? (
          <div className="h-10 w-full text-chart-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="v" stroke="currentColor" fill="currentColor" fillOpacity={0.15} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
