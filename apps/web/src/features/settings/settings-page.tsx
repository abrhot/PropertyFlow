'use client';

import { ApiError } from '@propertyflow/api-client';
import { ROLE_LABELS } from '@propertyflow/constants';
import type {
  AccountProfile,
  NotificationPreferences,
  OrganizationProfile,
} from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAbility } from '@/features/auth/ability-context';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { TeamInvitationsSection } from '@/features/invitations/team-settings-page';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const SETTINGS_QUERY_KEY = ['settings'] as const;
const ME_QUERY_KEY = ['auth', 'me'] as const;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function SettingsContent() {
  const ability = useAbility();
  const canEditOrganization = ability.can('update', 'Organization');
  const canInvite = ability.can('manage', 'Invitation');

  const settings = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => api.getSettings(),
  });

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account, notifications{canEditOrganization ? ', and organization' : ''}.
          </p>
        </div>

        {settings.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : settings.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-medium">Unable to load settings</p>
              <Button variant="outline" size="sm" onClick={() => settings.refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : settings.data ? (
          <>
            <ProfileCard profile={settings.data.profile} />
            <NotificationsCard preferences={settings.data.notifications} />
            {canEditOrganization && settings.data.organization && (
              <OrganizationCard organization={settings.data.organization} />
            )}
            {canInvite && <TeamInvitationsSection />}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function ProfileCard({ profile }: { profile: AccountProfile }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile</CardTitle>
        <CardDescription>Your personal account details.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <Button type="submit" disabled={!dirty || fullName.trim().length < 2 || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'notifyByEmail', label: 'Email notifications', description: 'Master switch for all email updates.' },
  { key: 'notifyPayments', label: 'Payments', description: 'Rent charges, receipts, and overdue reminders.' },
  { key: 'notifyMaintenance', label: 'Maintenance', description: 'Request status changes and work-order updates.' },
  { key: 'notifyMessages', label: 'Messages', description: 'New messages in your conversations.' },
  { key: 'notifyAnnouncements', label: 'Announcements', description: 'Product news and organization announcements.' },
];

function NotificationsCard({ preferences }: { preferences: NotificationPreferences }) {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState(preferences);
  useEffect(() => setPrefs(preferences), [preferences]);

  const mutation = useMutation({
    mutationFn: () => api.updateNotificationPreferences(prefs),
    onSuccess: async () => {
      toast.success('Notification preferences saved');
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to save preferences')),
  });

  const dirty = NOTIFICATION_ITEMS.some((item) => prefs[item.key] !== preferences[item.key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifications</CardTitle>
        <CardDescription>Choose which updates you receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {NOTIFICATION_ITEMS.map((item) => {
          const disabled = item.key !== 'notifyByEmail' && !prefs.notifyByEmail;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 border-b py-3 last:border-0"
            >
              <div className={cn('min-w-0', disabled && 'opacity-50')}>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Toggle
                checked={prefs[item.key]}
                disabled={disabled}
                label={item.label}
                onChange={(value) => setPrefs((current) => ({ ...current, [item.key]: value }))}
              />
            </div>
          );
        })}
        <div className="flex justify-end pt-4">
          <Button disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-background shadow-soft transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
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

function OrganizationCard({ organization }: { organization: OrganizationProfile }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          Organization
        </CardTitle>
        <CardDescription>
          Contact and address details for {organization.name}. Shown to residents and owners.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Button
              type="submit"
              disabled={!dirty || form.name.trim().length < 2 || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Save organization
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
