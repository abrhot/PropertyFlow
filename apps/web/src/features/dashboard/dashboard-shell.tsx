'use client';

import type { AppSection } from '@propertyflow/constants';
import { ROLE_LABELS } from '@propertyflow/constants';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
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
        mobile ? 'flex gap-2 overflow-x-auto border-b bg-background p-3 md:hidden' : 'space-y-1',
      )}
    >
      {sections.map((key) => {
        const item = SECTION_META[key];
        const isActive =
          pathname === item.path ||
          (item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`));
        const className = cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          mobile ? 'shrink-0' : 'w-full',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        );

        return (
          <Link
            key={key}
            href={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={className}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
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
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — tailored to the signed-in role */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-bold tracking-tight text-primary">PropertyFlow</span>
        </div>
        <div className="flex-1 p-3">
          <Navigation sections={sections} pathname={pathname} />
        </div>
        {user && (
          <div className="border-t p-3">
            <Badge variant="secondary" className="w-full justify-center py-1">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-8">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user?.fullName)}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <Navigation sections={sections} pathname={pathname} mobile />

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
