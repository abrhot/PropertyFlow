import { Building2, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade access',
    copy: 'Fine-grained, role-aware permissions on every action.',
  },
  {
    icon: TrendingUp,
    title: 'Live portfolio insight',
    copy: 'Occupancy, rent, and performance at a glance.',
  },
  {
    icon: Sparkles,
    title: 'Built for premium teams',
    copy: 'A refined workspace your owners will love.',
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      {/* Calm editorial panel that complements the warm sign-in surface. */}
      <aside className="relative hidden overflow-hidden border-r border-primary/10 bg-accent/70 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(34rem 34rem at 100% 0%, hsl(var(--primary) / 0.11), transparent 58%), radial-gradient(28rem 28rem at 0% 100%, hsl(var(--highlight) / 0.12), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold tracking-tight">PropertyFlow</span>
        </div>

        <div className="relative max-w-lg space-y-9">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              One connected workspace
            </p>
            <h2 className="text-4xl font-semibold leading-[1.12] tracking-tight">
              Property management
              <br />
              made beautifully simple.
            </h2>
            <p className="max-w-md text-muted-foreground">
              Give owners, teams, and residents a calm place to manage every detail.
            </p>
          </div>
          <ul className="grid gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, copy }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-primary/10 bg-card/55 p-3.5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          © {new Date().getFullYear()} PropertyFlow. All rights reserved.
        </p>
      </aside>

      {/* Form column */}
      <main className="bg-app flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[30rem]">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xl font-semibold tracking-tight">PropertyFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">Property Management, elevated</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
