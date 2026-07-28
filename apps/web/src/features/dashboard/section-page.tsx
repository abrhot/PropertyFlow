'use client';

import type { AppSection } from '@propertyflow/constants';
import { ArrowUpRight, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from './dashboard-shell';
import { SECTION_CONTENT } from './section-content';
import { SECTION_META } from './sections';

type Section = Exclude<AppSection, 'dashboard'>;

function SectionContent({ section }: { section: Section }) {
  const [query, setQuery] = useState('');
  const meta = SECTION_META[section];
  const content = SECTION_CONTENT[section];
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return content.rows;
    return content.rows.filter((row) =>
      [row.primary, row.secondary, row.tertiary, row.status].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [content.rows, query]);

  const previewNotice = () =>
    toast.info('Preview mode', {
      description: 'Connect this section to its domain API to enable data changes.',
    });

  return (
    <DashboardShell title={meta.label}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{meta.label}</h2>
              <Badge variant="outline">Preview data</Badge>
            </div>
            <p className="max-w-2xl text-muted-foreground">{meta.description}</p>
          </div>
          <Button onClick={previewNotice}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {content.action}
          </Button>
        </div>

        <section aria-label={`${meta.label} summary`} className="grid gap-4 md:grid-cols-3">
          {content.stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {stat.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Overview</CardTitle>
              <CardDescription>
                Representative data for the {meta.label.toLowerCase()} workspace.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={content.search}
                aria-label={content.search.replace('...', '')}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <span>{content.columns[0]}</span>
                <span>{content.columns[1]}</span>
                <span className="hidden sm:block">{content.columns[2]}</span>
                <span className="sr-only">Actions</span>
              </div>
              {rows.length ? (
                rows.map((row) => (
                  <div
                    key={`${row.primary}-${row.secondary}`}
                    className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 border-b px-4 py-4 text-sm last:border-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <span className="truncate font-medium">{row.primary}</span>
                    <span className="truncate text-muted-foreground">{row.secondary}</span>
                    <span className="hidden truncate text-muted-foreground sm:block">
                      {row.tertiary}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="secondary">{row.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open actions for ${row.primary}`}
                        onClick={previewNotice}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center">
                  <p className="font-medium">No matching results</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export function SectionPage({ section }: { section: Section }) {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject={section}>
        <SectionContent section={section} />
      </RequireAbility>
    </RequireAuth>
  );
}
