import { Building2, Home, ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const PANEL_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

const HIGHLIGHTS = [
  {
    icon: Home,
    title: 'Portfolio & residents',
    copy: 'Buildings, units, and tenants in one calm workspace.',
  },
  {
    icon: Wrench,
    title: 'Maintenance that closes',
    copy: 'From request to verified repair — with photo proof.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-aware access',
    copy: 'Admin, manager, technician, owner, and tenant — each sees what they need.',
  },
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Commercial brand panel — real property visual + clear product story */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PANEL_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold tracking-tight">PropertyFlow</span>
          </Link>

          <div className="max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Property management
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white xl:text-5xl">
                Run every building with clarity.
              </h1>
              <p className="text-base leading-relaxed text-white/75">
                Sign in to manage properties, rent, maintenance, and residents — or browse homes
                open to rent and buy.
              </p>
            </div>

            <ul className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, title, copy }) => (
                <li key={title} className="flex items-start gap-3 text-white">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-white/65">{copy}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/homes"
              className="inline-flex text-sm font-medium text-white underline-offset-4 hover:underline"
            >
              Browse available homes →
            </Link>
          </div>

          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} PropertyFlow. All rights reserved.
          </p>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex items-center justify-center bg-[hsl(42_38%_96%)] px-4 py-10 sm:px-8">
        <div className="w-full max-w-[26rem]">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xl font-semibold tracking-tight">PropertyFlow</span>
            </Link>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
