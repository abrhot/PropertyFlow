'use client';

import { ApiError } from '@propertyflow/api-client';
import { ROLE_LABELS } from '@propertyflow/constants';
import type { AccountProfile, OrganizationProfile } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, Loader2, UserRound } from 'lucide-react';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAbility } from '@/features/auth/ability-context';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const SETTINGS_QUERY_KEY = ['settings'] as const;
const ME_QUERY_KEY = ['auth', 'me'] as const;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * A collapsible settings section. Everything is on one page, but each area can
 * be expanded or hidden with its header button so the page stays scannable.
 */
function SettingsSection({
  icon: Icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold">{title}</span>
            <span className="block truncate text-sm text-muted-foreground">{description}</span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {open && <div className="border-t p-4 sm:p-5">{children}</div>}
    </Card>
  );
}

function SettingsContent() {
  const ability = useAbility();
  const canEditOrganization = ability.can('update', 'Organization');

  const settings = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => api.getSettings(),
  });

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account{canEditOrganization ? ' and organization' : ''}.
          </p>
        </div>

        {settings.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : settings.isError ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-medium">Unable to load settings</p>
              <Button variant="outline" size="sm" onClick={() => settings.refetch()}>
                Try again
              </Button>
            </div>
          </Card>
        ) : settings.data ? (
          <div className="space-y-4">
            <SettingsSection
              icon={UserRound}
              title="Profile"
              description="Your personal account details."
              defaultOpen
            >
              <ProfileForm profile={settings.data.profile} />
            </SettingsSection>

            {canEditOrganization && settings.data.organization && (
              <SettingsSection
                icon={Building2}
                title="Organization"
                description={`Contact and address details for ${settings.data.organization.name}.`}
              >
                <OrganizationForm organization={settings.data.organization} />
              </SettingsSection>
            )}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function ProfileForm({ profile }: { profile: AccountProfile }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile.fullName);
  useEffect(() => setFullName(profile.fullName), [profile.fullName]);

  const mutation = useMutation({
    mutationFn: () => api.updateProfile({ fullName: fullName.trim() }),
    onSuccess: async () => {
      toast.success('Profile updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to update profile')),
  });

  const dirty = fullName.trim() !== profile.fullName;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && fullName.trim().length >= 2) mutation.mutate();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={profile.email} disabled />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Input value={ROLE_LABELS[profile.role]} disabled />
      </div>
      <div className="flex items-end justify-end sm:col-span-2">
        <Button
          type="submit"
          disabled={!dirty || fullName.trim().length < 2 || mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

type OrgFormState = Record<
  'name' | 'contactEmail' | 'contactPhone' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode' | 'websiteUrl',
  string
>;

function toFormState(organization: OrganizationProfile): OrgFormState {
  return {
    name: organization.name,
    contactEmail: organization.contactEmail ?? '',
    contactPhone: organization.contactPhone ?? '',
    addressLine1: organization.addressLine1 ?? '',
    addressLine2: organization.addressLine2 ?? '',
    city: organization.city ?? '',
    state: organization.state ?? '',
    postalCode: organization.postalCode ?? '',
    websiteUrl: organization.websiteUrl ?? '',
  };
}

function OrganizationForm({ organization }: { organization: OrganizationProfile }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrgFormState>(() => toFormState(organization));
  useEffect(() => setForm(toFormState(organization)), [organization]);

  const mutation = useMutation({
    mutationFn: () => api.updateOrganizationProfile(form),
    onSuccess: async () => {
      toast.success('Organization profile saved');
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to save organization')),
  });

  const dirty = (Object.keys(form) as (keyof OrgFormState)[]).some(
    (key) => form[key] !== toFormState(organization)[key],
  );

  function update(key: keyof OrgFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && form.name.trim().length >= 2) mutation.mutate();
      }}
    >
      <OrgField id="org-name" label="Name" value={form.name} onChange={(v) => update('name', v)} />
      <OrgField
        id="org-website"
        label="Website"
        value={form.websiteUrl}
        placeholder="https://example.com"
        onChange={(v) => update('websiteUrl', v)}
      />
      <OrgField
        id="org-email"
        label="Contact email"
        type="email"
        value={form.contactEmail}
        onChange={(v) => update('contactEmail', v)}
      />
      <OrgField
        id="org-phone"
        label="Contact phone"
        value={form.contactPhone}
        onChange={(v) => update('contactPhone', v)}
      />
      <OrgField
        id="org-address1"
        label="Address line 1"
        value={form.addressLine1}
        onChange={(v) => update('addressLine1', v)}
      />
      <OrgField
        id="org-address2"
        label="Address line 2"
        value={form.addressLine2}
        onChange={(v) => update('addressLine2', v)}
      />
      <OrgField id="org-city" label="City" value={form.city} onChange={(v) => update('city', v)} />
      <OrgField
        id="org-state"
        label="State / Region"
        value={form.state}
        onChange={(v) => update('state', v)}
      />
      <OrgField
        id="org-postal"
        label="Postal code"
        value={form.postalCode}
        onChange={(v) => update('postalCode', v)}
      />
      <div className="flex items-end justify-end sm:col-span-2">
        <Button type="submit" disabled={!dirty || form.name.trim().length < 2 || mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          Save organization
        </Button>
      </div>
    </form>
  );
}

function OrgField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SettingsPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="settings">
        <SettingsContent />
      </RequireAbility>
    </RequireAuth>
  );
}
