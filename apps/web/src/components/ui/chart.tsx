'use client';

import * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('Chart components must be used inside ChartContainer');
  return context;
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, className, children, ...props }, ref) => (
    <ChartContext.Provider value={config}>
      <div
        ref={ref}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none',
          className,
        )}
        {...props}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  ),
);
ChartContainer.displayName = 'ChartContainer';

interface TooltipEntry {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
}

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  valueFormatter?: (value: string | number) => string;
}

function ChartTooltipContent({
  active,
  label,
  payload,
  className,
  valueFormatter = String,
}: ChartTooltipContentProps) {
  const config = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'grid min-w-36 gap-2 rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-elevated backdrop-blur',
        className,
      )}
    >
      <p className="font-medium text-foreground">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? '');
          const itemConfig = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color ?? itemConfig?.color }}
                />
                {itemConfig?.label ?? item.name}
              </span>
              <span className="font-mono font-medium text-foreground">
                {valueFormatter(item.value ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltipContent };
