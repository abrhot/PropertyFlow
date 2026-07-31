import { SESSION_HINT_COOKIE } from '@propertyflow/constants';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquare,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'PropertyFlow — Property management, elevated',
  description:
    'Run your entire portfolio in one place: properties, leases, rent collection, maintenance, and reporting — with role-based access built in.',
};

const FEATURES = [
  {
    icon: Building2,
    title: 'Properties & units',
    body: 'A living portfolio with occupancy, rent roll, and per-unit detail — photos included.',
  },
  {
    icon: FileText,
    title: 'Leases & applications',
    body: 'From applicant screening to signed lease, track every agreement and renewal.',
  },
  {
    icon: CreditCard,
    title: 'Rent & payments',
    body: 'A clean ledger for staff and a one-tap “Pay rent” experience for tenants.',
  },
  {
    icon: Wrench,
    title: 'Maintenance & work orders',
    body: 'Tenants submit requests; staff triage, assign, and close them out in the field.',
  },
  {
    icon: BarChart3,
    title: 'Reports & insights',
    body: 'Owner- and org-scoped analytics with trend charts and exportable tables.',
  },
  {
    icon: MessageSquare,
    title: 'Messaging',
    body: 'Keep residents and management on the same page in one secure thread.',
  },
];

const ROLES = [
  { title: 'Organization Admin', body: 'Full control of staff, portfolio, finances, and settings.' },
  { title: 'Property Manager', body: 'Day-to-day operations across properties, leases, and maintenance.' },
  { title: 'Owner', body: 'A private view of performance for the properties they own.' },
  { title: 'Tenant', body: 'Pay rent, submit requests, and view the lease — nothing else.' },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  if (cookieStore.has(SESSION_HINT_COOKIE)) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-app text-foreground">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            PropertyFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Role-based access, built in
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Property management,{' '}
              <span className="text-primary">beautifully elevated.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Run your entire portfolio in one place — properties, leases, rent collection,
              maintenance, and reporting — with the right access for every person on your team.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Start free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Explore a demo</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              {['No credit card', 'Multi-tenant secure', 'Installable app'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-secondary/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80"
                alt="A modern apartment building"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border/60 bg-background/50">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything, in one workspace</h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built modules that share one data model — so your team never juggles tools.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
          <div className="relative order-last lg:order-first">
            <div className="overflow-hidden rounded-2xl border border-border shadow-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=1400&q=80"
                alt="A residential townhome community"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">The right access for everyone</h2>
            <p className="mt-3 text-muted-foreground">
              PropertyFlow tailors every screen to who is signed in. People only ever see what
              belongs to them.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {ROLES.map((role) => (
                <div key={role.title} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold">{role.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{role.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-background/50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to elevate your portfolio?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign in with a demo role and click around — every module is live.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Create your account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            PropertyFlow
          </div>
          <p>© {new Date().getFullYear()} PropertyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
