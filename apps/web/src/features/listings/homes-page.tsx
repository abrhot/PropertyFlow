'use client';

import { ApiError } from '@propertyflow/api-client';
import { PROPERTY_TYPE_LABELS } from '@propertyflow/constants';
import type { ListingInterest, PublicListing } from '@propertyflow/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  Home,
  Loader2,
  MapPin,
  Maximize2,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=60';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=60';

const DELIVERABLES = [
  {
    icon: Home,
    title: 'Move-in ready homes',
    body: 'Vacant units across apartments, townhomes, and houses — sized and priced clearly.',
  },
  {
    icon: Wrench,
    title: 'Responsive maintenance',
    body: 'Report issues from your unit; our team triages, assigns, and closes the loop.',
  },
  {
    icon: ShieldCheck,
    title: 'Managed with care',
    body: 'On-site operations, secure access, and a single team for rent or purchase inquiries.',
  },
] as const;

function formatRent(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function sizeLabel(listing: PublicListing): string {
  if (listing.squareFeet) return `${listing.squareFeet.toLocaleString()} sqft`;
  return 'Size on request';
}

function bedLabel(bedrooms: number): string {
  if (bedrooms === 0) return 'Studio';
  return `${bedrooms} bed${bedrooms === 1 ? '' : 's'}`;
}

export function HomesPage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<PublicListing | null>(null);
  const [inquiry, setInquiry] = useState<{
    listing: PublicListing;
    interest: ListingInterest;
  } | null>(null);

  const deferredSearch = useDebounced(search);
  const listings = useQuery({
    queryKey: ['public-listings', deferredSearch],
    queryFn: () => api.listPublicListings({ search: deferredSearch || undefined }),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });

  const rows = listings.data?.listings ?? [];

  useEffect(() => {
    const unitId = new URLSearchParams(window.location.search).get('unit');
    if (!unitId || detail) return;
    const found = rows.find((row) => row.unitId === unitId);
    if (found) setDetail(found);
  }, [rows, detail]);
  const stats = useMemo(() => {
    const cities = new Set(rows.map((row) => row.city));
    const avgSqft =
      rows.filter((row) => row.squareFeet).reduce((sum, row) => sum + (row.squareFeet ?? 0), 0) /
      (rows.filter((row) => row.squareFeet).length || 1);
    return {
      available: rows.length,
      cities: cities.size,
      avgSqft: rows.some((row) => row.squareFeet) ? Math.round(avgSqft) : null,
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            PropertyFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-white text-foreground hover:bg-white/90">
              <a href="#homes">Browse homes</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Full-bleed commercial hero */}
      <section className="relative min-h-[78vh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <p className="text-sm font-medium tracking-wide text-white/80">PropertyFlow Homes</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Homes built for living — ready to rent or buy.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">
            See size, layout, and facilities for every available home. Inquire in one step — our
            team follows up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
              <a href="#homes">
                View available homes
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#deliver">What we deliver</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="deliver" className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What we deliver</h2>
            <p className="mt-2 text-muted-foreground">
              A clear path from browsing to move-in — with the details you need before you decide.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {DELIVERABLES.map((item) => (
              <div key={item.title} className="space-y-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main id="homes" className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Available homes</h2>
            <p className="text-muted-foreground">
              Each listing shows size, bedrooms, bathrooms, and the facilities that come with the
              home. Open a home for the full detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Available" value={String(stats.available)} />
            <Stat label="Cities" value={String(stats.cities)} />
            {stats.avgSqft != null && (
              <Stat label="Avg. size" value={`${stats.avgSqft.toLocaleString()} sqft`} />
            )}
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by building, city, or unit..."
            className="pl-9"
          />
        </div>

        {listings.isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : listings.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <p className="font-medium">Unable to load homes</p>
            <Button variant="outline" onClick={() => listings.refetch()}>
              Try again
            </Button>
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
            <Home className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No vacant homes right now</p>
            <p className="text-sm text-muted-foreground">Check back soon or contact the office.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {rows.map((listing) => (
              <article
                key={listing.unitId}
                className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
              >
                <button
                  type="button"
                  onClick={() => setDetail(listing)}
                  className="relative block min-h-[220px] text-left md:min-h-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.imageUrl || FALLBACK_IMAGE}
                    alt={`${listing.propertyName} ${listing.label}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
                <div className="flex flex-col justify-between gap-5 p-5 sm:p-7">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {PROPERTY_TYPE_LABELS[listing.propertyType]}
                      </Badge>
                      {listing.yearBuilt && (
                        <Badge variant="outline">Built {listing.yearBuilt}</Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">
                        {listing.propertyName}
                        <span className="text-muted-foreground"> · {listing.label}</span>
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {listing.addressLine1}, {listing.city}, {listing.state}{' '}
                        {listing.postalCode}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                      <Spec icon={BedDouble} label="Layout" value={bedLabel(listing.bedrooms)} />
                      <Spec
                        icon={Bath}
                        label="Baths"
                        value={`${listing.bathrooms} bath${listing.bathrooms === 1 ? '' : 's'}`}
                      />
                      <Spec icon={Ruler} label="Size" value={sizeLabel(listing)} />
                    </div>

                    {listing.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {listing.description}
                      </p>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Facilities
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {listing.facilities.slice(0, 5).map((facility) => (
                          <li
                            key={facility}
                            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"
                          >
                            <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                            {facility}
                          </li>
                        ))}
                        {listing.facilities.length > 5 && (
                          <li className="inline-flex items-center rounded-md px-2 py-1 text-xs text-muted-foreground">
                            +{listing.facilities.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="text-2xl font-semibold tracking-tight">
                        {listing.marketRentCents > 0
                          ? `${formatRent(listing.marketRentCents)}`
                          : 'Ask for price'}
                        {listing.marketRentCents > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setDetail(listing)}>
                        <Maximize2 className="h-4 w-4" />
                        View details
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setInquiry({ listing, interest: 'BUY' })}
                      >
                        Buy
                      </Button>
                      <Button onClick={() => setInquiry({ listing, interest: 'RENT' })}>
                        Rent
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            PropertyFlow — managed homes for rent and purchase.
          </p>
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Staff sign in
          </Link>
        </div>
      </footer>

      <DetailDialog
        listing={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        onInquire={(interest) => {
          if (!detail) return;
          setDetail(null);
          setInquiry({ listing: detail, interest });
        }}
      />

      <InquiryDialog
        listing={inquiry?.listing ?? null}
        interest={inquiry?.interest ?? 'RENT'}
        onInterestChange={(interest) =>
          setInquiry((current) => (current ? { ...current, interest } : null))
        }
        onOpenChange={(open) => !open && setInquiry(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function DetailDialog({
  listing,
  onOpenChange,
  onInquire,
}: {
  listing: PublicListing | null;
  onOpenChange: (open: boolean) => void;
  onInquire: (interest: ListingInterest) => void;
}) {
  return (
    <Dialog open={Boolean(listing)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {listing && (
          <>
            <div className="-mx-6 -mt-6 mb-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.imageUrl || FALLBACK_IMAGE}
                alt={`${listing.propertyName} ${listing.label}`}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
            <DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{PROPERTY_TYPE_LABELS[listing.propertyType]}</Badge>
                {listing.yearBuilt && <Badge variant="outline">Built {listing.yearBuilt}</Badge>}
              </div>
              <DialogTitle className="text-2xl">
                {listing.propertyName} · {listing.label}
              </DialogTitle>
              <DialogDescription className="flex items-start gap-1.5 text-left">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {listing.addressLine1}, {listing.city}, {listing.state} {listing.postalCode}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 rounded-xl border p-4 text-sm">
              <Spec icon={BedDouble} label="Layout" value={bedLabel(listing.bedrooms)} />
              <Spec
                icon={Bath}
                label="Baths"
                value={`${listing.bathrooms} bath${listing.bathrooms === 1 ? '' : 's'}`}
              />
              <Spec icon={Ruler} label="Size" value={sizeLabel(listing)} />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">About this home</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {listing.description?.trim() ||
                  `A ${PROPERTY_TYPE_LABELS[listing.propertyType].toLowerCase()} unit with ${bedLabel(listing.bedrooms).toLowerCase()}, ${listing.bathrooms} bathroom${listing.bathrooms === 1 ? '' : 's'}${listing.squareFeet ? `, and ${listing.squareFeet.toLocaleString()} sqft of living space` : ''}. Managed by PropertyFlow with responsive maintenance and clear move-in support.`}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Facilities &amp; services</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {listing.facilities.map((facility) => (
                  <li
                    key={facility}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {facility}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-2xl font-semibold">
                {listing.marketRentCents > 0
                  ? `${formatRent(listing.marketRentCents)}`
                  : 'Ask for price'}
                {listing.marketRentCents > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">/mo rent</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onInquire('BUY')}>
                  Inquire to buy
                </Button>
                <Button onClick={() => onInquire('RENT')}>Inquire to rent</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InquiryDialog({
  listing,
  interest,
  onInterestChange,
  onOpenChange,
}: {
  listing: PublicListing | null;
  interest: ListingInterest;
  onInterestChange: (value: ListingInterest) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.submitPublicInquiry({
        unitId: listing!.unitId,
        interest,
        applicantName: name.trim(),
        applicantEmail: email.trim(),
        applicantPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (response) => {
      toast.success(response.message);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to send inquiry'),
  });

  const canSubmit = name.trim().length >= 2 && email.includes('@');

  return (
    <Dialog open={Boolean(listing)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request to {interest === 'BUY' ? 'buy' : 'rent'}</DialogTitle>
          <DialogDescription>
            {listing
              ? `${listing.propertyName} · ${listing.label} — ${sizeLabel(listing)}, ${bedLabel(listing.bedrooms)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={interest === 'RENT' ? 'default' : 'outline'}
              onClick={() => onInterestChange('RENT')}
            >
              Rent
            </Button>
            <Button
              type="button"
              size="sm"
              variant={interest === 'BUY' ? 'default' : 'outline'}
              onClick={() => onInterestChange('BUY')}
            >
              Buy
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-name">Full name</Label>
            <Input
              id="inquiry-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-email">Email</Label>
            <Input
              id="inquiry-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-phone">Phone (optional)</Label>
            <Input
              id="inquiry-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-notes">Message (optional)</Label>
            <Textarea
              id="inquiry-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Tell us when you want to move or any questions…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending}>
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send inquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
