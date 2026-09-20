'use client';

import { cn } from '@/lib/utils';

const RANGES = [
  { key: '3m', label: 'Last 3 months', days: 90 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '7d', label: 'Last 7 days', days: 7 },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

export function rangeDays(key: RangeKey): number {
  return RANGES.find((range) => range.key === key)?.days ?? 90;
}

export function RangeToggle({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
      {RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          onClick={() => onChange(range.key)}
          aria-pressed={value === range.key}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === range.key
              ? 'bg-background text-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
