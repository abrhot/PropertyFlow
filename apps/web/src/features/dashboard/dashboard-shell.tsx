'use client';

import type { AppSection } from '@propertyflow/constants';
import { ROLE_LABELS } from '@propertyflow/constants';
import { Building2, Bot, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAssistant, AssistantPanel } from '@/components/propertyflow-assistant';
import { useAccessibleSections } from '@/features/auth/ability-context';
import { useAuth } from '@/features/auth/auth-context';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { cn } from '@/lib/utils';
import { SECTION_META } from './sections';

const COLLAPSE_KEY = 'pf-nav-collapsed';

function initials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isSectionActive(path: string, pathname: string) {
  return pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));
}

/** A single vertical nav row that shrinks to an icon-only tile when collapsed. */
function NavItem({
  section,
  pathname,
  collapsed,
}: {
  section: AppSection;
  pathname: string;
  collapsed: boolean;
}) {
  const item = SECTION_META[section];
  const isActive = isSectionActive(item.path, pathname);

  return (
    <Link
      href={item.path}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/nav flex items-center rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-primary text-primary-foreground shadow-soft'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          !isActive && 'text-muted-foreground/70 group-hover/nav:text-foreground',
        )}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

/** Horizontal, scrollable navigation shown on small screens. */
function MobileNav({
  sections,
  pathname,
  onLogout,
}: {
  sections: AppSection[];
  pathname: string;
  onLogout: () => void;
}) {
  const { setOpen: setAssistantOpen } = useAssistant();
  return (
    <nav
      aria-label="Dashboard navigation"
      className="bg-frost sticky top-16 z-10 flex items-center gap-2 overflow-x-auto border-b p-3 md:hidden"
    >
      {sections.map((key) => {
        const item = SECTION_META[key];
        const isActive = isSectionActive(item.path, pathname);
        return (
          <Link
            key={key}
            href={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bot className="h-4 w-4" aria-hidden="true" />
        <span>Assistant</span>
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="ml-1 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </nav>
  );
}

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const { open: assistantOpen, setOpen: setAssistantOpen } = useAssistant();
  const router = useRouter();
  const pathname = usePathname();
  const sections = useAccessibleSections();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — tailored to the signed-in role. Collapses to an icon rail. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex',
          collapsed ? 'w-[4.75rem]' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b',
            collapsed ? 'justify-center px-2' : 'gap-2 px-4',
          )}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          {!collapsed && (
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold tracking-tight">PropertyFlow</span>
            </span>
          )}
        </div>

        <nav
          aria-label="Dashboard navigation"
          className={cn(
            'flex-1 space-y-1 overflow-y-auto py-3',
            collapsed ? 'flex flex-col items-center px-2' : 'px-3',
          )}
        >
          {sections.map((key) => (
            <NavItem key={key} section={key} pathname={pathname} collapsed={collapsed} />
          ))}
          <button
            type="button"
            onClick={() => setAssistantOpen(!assistantOpen)}
            title={collapsed ? 'Assistant' : undefined}
            aria-pressed={assistantOpen}
            className={cn(
              'group/nav flex items-center rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5',
              assistantOpen
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Bot
              className={cn(
                'h-[18px] w-[18px] shrink-0',
                !assistantOpen && 'text-muted-foreground/70 group-hover/nav:text-foreground',
              )}
            />
            {!collapsed && <span className="truncate">Assistant</span>}
          </button>
        </nav>

        {user && (
          <div className={cn('border-t', collapsed ? 'p-2' : 'p-3')}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  title={`${user.fullName} · ${ROLE_LABELS[user.role]}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {initials(user.fullName)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(user.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{user.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-frost sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 md:px-8">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <NotificationBell />
          </header>

          <MobileNav sections={sections} pathname={pathname} onLogout={handleLogout} />

          <main className="mx-auto w-full max-w-[96rem] flex-1 p-4 md:p-8">{children}</main>
        </div>

        {assistantOpen ? (
          <AssistantPanel
            docked
            className="sticky top-0 hidden h-screen w-[22rem] shrink-0 border-l md:flex"
          />
        ) : null}
      </div>

      {assistantOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close assistant"
            onClick={() => setAssistantOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md overflow-hidden bg-card shadow-xl">
            <AssistantPanel />
          </div>
        </div>
      ) : null}
    </div>
  );
}
