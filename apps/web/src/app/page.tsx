import { SESSION_HINT_COOKIE } from '@propertyflow/constants';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'PropertyFlow - Property management, elevated',
  description:
    'Run your entire portfolio in one place: properties, leases, rent collection, maintenance, reporting, and a native mobile companion.',
};

const FEATURES = [
  {
    icon: Building2,
    title: 'Properties and units',
    body: 'A living portfolio with occupancy, rent roll, and per-unit detail, including photos.',
  },
  {
    icon: FileText,
    title: 'Leases and applications',
    body: 'From applicant screening to signed lease, track every agreement and renewal.',
  },
  {
    icon: CreditCard,
    title: 'Rent and payments',
    body: 'A clean ledger for staff and a one-tap pay-rent experience for tenants.',
  },
  {
    icon: Wrench,
    title: 'Maintenance and work orders',
    body: 'Tenants submit requests; staff triage, assign, and close them out in the field.',
  },
  {
    icon: BarChart3,
    title: 'Reports and insights',
    body: 'Owner- and org-scoped analytics with trend charts and exportable tables.',
  },
  {
    icon: MessageSquare,
    title: 'Messaging',
    body: 'Keep residents and management on the same page in one secure thread.',
  },
];

const ROLES = [
  {
    title: 'Organization Admin',
    body: 'Full control of staff, portfolio, finances, and settings.',
  },
  {
    title: 'Property Manager',
    body: 'Day-to-day operations across properties, leases, and maintenance.',
  },
  { title: 'Owner', body: 'A private view of performance for the properties they own.' },
  { title: 'Tenant', body: 'Pay rent, submit requests, and view the lease - nothing else.' },
];

const MOBILE_SCREENS = [
  {
    label: 'Resident home',
    title: 'Pay rent and jump straight into open requests.',
    accent: 'bg-primary',
    metric: '2 taps to action',
    chips: ['Rent due', 'Open requests', 'Lease access'],
    body: 'The home screen surfaces the most urgent tasks first.',
  },
  {
    label: 'Maintenance',
    title: 'Triage work orders and update jobs in the field.',
    accent: 'bg-highlight',
    metric: 'Live job status',
    chips: ['Assigned', 'In progress', 'Closed'],
    body: 'See what needs attention without opening a laptop.',
  },
  {
    label: 'Messages',
    title: 'Keep residents, owners, and staff in one thread.',
    accent: 'bg-secondary',
    metric: 'Instant alerts',
    chips: ['Unread', 'Attachments', 'Deep links'],
    body: 'Conversation cards and deep links keep the flow tight.',
  },
];

function PhoneFrame({
  label,
  title,
  accent,
  metric,
  chips,
  body,
}: {
  label: string;
  title: string;
  accent: string;
  metric: string;
  chips: string[];
  body: string;
}) {
  return (
    <div className="w-[15rem] max-w-full shrink-0 snap-center md:w-full">
      <div className="rounded-[2.2rem] border border-border bg-card p-2.5 shadow-elevated">
        <div className="relative overflow-hidden rounded-[1.8rem] border border-border bg-background">
          <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-border/80" />
          <div className="flex flex-col gap-3 px-3.5 pb-5 pt-7">
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Live
              </span>
            </div>
            <div className={`rounded-2xl ${accent} p-3.5 text-primary-foreground shadow-glow`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary-foreground/80">
                  {metric}
                </span>
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-primary-foreground/85">{body}</p>
            </div>
            <div className="grid gap-1.5">
              {chips.map((chip) => (
                <div
                  key={chip}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-1.5 text-xs"
                >
                  <span>{chip}</span>
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  if (cookieStore.has(SESSION_HINT_COOKIE)) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-app text-foreground">
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
              <Link href="/homes">Available homes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="#mobile-app">Mobile app</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Role-based access, built in
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Property management, <span className="text-primary">beautifully elevated.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Run your entire portfolio in one place - properties, leases, rent collection,
              maintenance, reporting, and a native mobile companion for residents and staff.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/homes">
                  Browse homes
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#mobile-app">Download mobile app</Link>
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
            <div className="relative grid gap-4 sm:grid-cols-[1.15fr_0.95fr]">
              <div className="rounded-[2rem] border border-border bg-card/85 p-3 shadow-elevated backdrop-blur">
                <div className="overflow-hidden rounded-[1.6rem] border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        Mobile overview
                      </p>
                      <p className="mt-1 text-sm font-semibold">The app in your pocket</p>
                    </div>
                    <Smartphone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="rounded-2xl bg-primary/10 p-4">
                      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        <span>Today</span>
                        <span>PropertyFlow mobile</span>
                      </div>
                      <p className="mt-3 text-2xl font-semibold">3 tasks waiting</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Rent, maintenance, and messages all land on one home screen.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Quick action
                        </p>
                        <p className="mt-2 font-semibold">Pay rent</p>
                        <p className="mt-1 text-sm text-muted-foreground">Secure and fast.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Alerts
                        </p>
                        <p className="mt-2 font-semibold">Open requests</p>
                        <p className="mt-1 text-sm text-muted-foreground">Follow every update.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[1.75rem] border border-border bg-card/90 p-4 shadow-soft backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Build
                      </p>
                      <p className="mt-1 font-semibold">Expo Go ready</p>
                    </div>
                    <QrCode className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Start the mobile app locally with `pnpm dev:mobile`, then scan the Expo QR code
                    from Expo Go on your phone.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-border bg-card/90 p-4 shadow-soft backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    What is inside
                  </p>
                  <div className="mt-3 grid gap-2">
                    {['Resident dashboard', 'Maintenance jobs', 'Secure chat', 'Notifications'].map(
                      (item) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background/50">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything, in one workspace</h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built modules that share one data model so your team never juggles tools.
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

      <section
        id="mobile-app"
        className="border-t border-border/60 bg-gradient-to-b from-background to-background/70"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Native mobile app
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              A polished app for residents, maintenance, and managers.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              The mobile experience keeps the most common tasks close at hand: pay rent, answer
              requests, follow conversations, and get updates the moment something changes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#mobile-app">Download app</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Expo Go friendly for quick testing',
                'Role-aware screens for each user type',
                'Secure auth with device storage',
                'Push notifications and deep links',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 hidden rounded-[2rem] bg-gradient-to-tr from-primary/15 via-transparent to-highlight/20 blur-3xl md:block" />
            <div className="relative -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:mx-0 md:grid md:grid-cols-3 md:items-start md:overflow-visible md:px-0 md:pb-0">
              {MOBILE_SCREENS.map((screen, index) => (
                <div key={screen.label} className={index === 1 ? 'md:translate-y-8' : ''}>
                  <PhoneFrame {...screen} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      <section className="border-t border-border/60 bg-background/50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to elevate your portfolio?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign in with a demo role, or open the mobile app in Expo Go to see the native flow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Create your account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#mobile-app">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download app
              </Link>
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
          <p>&copy; {new Date().getFullYear()} PropertyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
