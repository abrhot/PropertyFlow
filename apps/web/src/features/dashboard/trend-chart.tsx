'use client';

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface TrendDatum {
  x: string;
  primary: number;
  secondary: number;
}

interface TrendChartProps {
  data: TrendDatum[];
  primaryLabel: string;
  secondaryLabel: string;
  valueFormatter?: (value: string | number) => string;
  xTickFormatter?: (value: string) => string;
  className?: string;
}

/**
 * The shadcn "stacked gradient area" chart used across the dashboard and reports.
 * Two soft-filled areas share one axis so a single row communicates the trend.
 */
export function TrendChart({
  data,
  primaryLabel,
  secondaryLabel,
  valueFormatter = (value) => `$${Number(value).toLocaleString()}`,
  xTickFormatter,
  className,
}: TrendChartProps) {
  const config = {
    primary: { label: primaryLabel, color: 'hsl(var(--primary))' },
    secondary: { label: secondaryLabel, color: 'hsl(var(--warning))' },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-[280px] w-full', className)}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="trendPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={config.primary.color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={config.primary.color} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="trendSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={config.secondary.color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={config.secondary.color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="x"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={xTickFormatter}
        />
        <YAxis axisLine={false} tickLine={false} width={48} tickFormatter={(value) => valueFormatter(value)} />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent valueFormatter={valueFormatter} />}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          stroke={config.secondary.color}
          strokeWidth={2}
          fill="url(#trendSecondary)"
          stackId="a"
        />
        <Area
          type="monotone"
          dataKey="primary"
          stroke={config.primary.color}
          strokeWidth={2}
          fill="url(#trendPrimary)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export type { RangeKey } from './range-toggle';
export { RangeToggle, rangeDays } from './range-toggle';
