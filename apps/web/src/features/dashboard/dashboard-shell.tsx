'use client';

import type { AppSection } from '@propertyflow/constants';
import { ROLE_LABELS } from '@propertyflow/constants';
import { Building2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibleSections } from '@/features/auth/ability-context';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { SECTION_META } from './sections';

function initials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Navigation({
  sections,
  pathname,
  mobile = false,
}: {
  sections: AppSection[];
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label="Dashboard navigation"
      className={cn(
        mobile
          ? 'bg-frost sticky top-16 z-10 flex gap-2 overflow-x-auto border-b p-3 md:hidden'
          : 'space-y-1',
      )}
    >
      {sections.map((key) => {
        const item = SECTION_META[key];
        const isActive =
          pathname === item.path ||
          (item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`));
        const className = cn(
          'group/nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          mobile ? 'shrink-0' : 'w-full',
          isActive
            ? 'bg-primary text-primary-foreground shadow-soft'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        );

        return (
          <Link
            key={key}
            href={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={className}
          >
            <item.icon
              className={cn(
                'h-4 w-4 transition-colors',
                !isActive && 'text-muted-foreground/70 group-hover/nav:text-foreground',
              )}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sections = useAccessibleSections();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — tailored to the signed-in role */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PropertyFlow</span>
        </div>
        <div className="flex-1 overflow-y-auto border-t p-3">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </p>
          <Navigation sections={sections} pathname={pathname} />
        </div>
        {user && (
          <div className="border-t p-3">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">{user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-frost sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 md:px-8">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              {initials(user?.fullName)}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <Navigation sections={sections} pathname={pathname} mobile />

        <main className="mx-auto w-full max-w-[96rem] flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
