'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { formatCents } from '@/features/properties/format';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

const TrendChart = dynamic(
  () => import('@/features/dashboard/trend-chart').then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-muted" />,
  },
);

const occupancyChartConfig = {
  occupancy: { label: 'Occupancy', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function OccupancyChart({ data }: { data: { property: string; occupancy: number }[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No buildings to report on yet.
      </div>
    );
  }
  return (
    <ChartContainer config={occupancyChartConfig} className="aspect-auto h-[280px] w-full">
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="property"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval={0}
          tickFormatter={(value: string) => (value.length > 10 ? `${value.slice(0, 10)}…` : value)}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent valueFormatter={(value) => `${value}%`} />}
        />
        <Bar dataKey="occupancy" fill="var(--color-occupancy)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

interface ReportRow {
  id: string;
  report: string;
  category: string;
  period: string;
  generated: string;
  status: 'Ready';
}

const columns: ColumnDef<ReportRow>[] = [
  {
    accessorKey: 'report',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Report <ArrowUpDown className="h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.report}</span>,
  },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'generated', header: 'Last generated' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'Ready' ? 'success' : 'secondary'}>
        {row.original.status}
      </Badge>
    ),
  },
];

function ReportsContent() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState('');
  const dashboard = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.getReportDashboard(),
  });
  const table = useReactTable({
    data: dashboard.data?.reports ?? [],
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <DashboardShell title="Reports">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Portfolio analytics</h2>
            <p className="mt-1 text-muted-foreground">
              Financial and operating performance across your portfolio.
            </p>
          </div>
          <Button
            onClick={() =>
              toast.success('Report prepared', {
                description: 'The portfolio summary is ready to download.',
              })
            }
          >
            <ArrowDownToLine className="h-4 w-4" />
            Export report
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-3" aria-label="Report summary">
          {[
            ['Collected', dashboard.data ? formatCents(dashboard.data.summary.collectedCents) : '—', 'Paid ledger entries'],
            ['Outstanding', dashboard.data ? formatCents(dashboard.data.summary.outstandingCents) : '—', 'Pending, late, and failed'],
            ['Occupancy', dashboard.data ? `${dashboard.data.summary.occupancyRate}%` : '—', 'Across accessible properties'],
          ].map(([label, value, detail]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">{value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-primary">{detail}</CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cash flow</CardTitle>
              <CardDescription>
                Collected and outstanding rent over the last six months.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={(dashboard.data?.cashFlow ?? []).map((point) => ({
                  x: point.month,
                  primary: point.collected,
                  secondary: point.outstanding,
                }))}
                primaryLabel="Collected"
                secondaryLabel="Outstanding"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Occupancy by building</CardTitle>
              <CardDescription>Share of occupied units across your portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
              <OccupancyChart data={dashboard.data?.occupancy ?? []} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
            <div>
              <CardTitle className="text-lg">Saved reports</CardTitle>
              <CardDescription>Search and sort generated portfolio reports.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search reports..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3 font-medium">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} reports
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export function ReportsPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="reports">
        <ReportsContent />
      </RequireAbility>
    </RequireAuth>
  );
}
