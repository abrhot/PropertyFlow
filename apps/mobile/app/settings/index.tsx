import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ROLE_LABELS, SUBSCRIPTION_TIER_LABELS } from '@propertyflow/constants';
import type { NotificationPreferences } from '@propertyflow/types';
import { updateOrganizationProfileSchema } from '@propertyflow/validation';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  Field,
  KeyValue,
  ListRow,
  Row,
  Screen,
  ToggleRow,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { validate, type FieldErrors } from '@/lib/form';
import { getApiHostLabel } from '@/lib/server-config';

const NOTIFICATION_ROWS: { key: keyof NotificationPreferences; title: string; subtitle: string }[] = [
  { key: 'notifyByEmail', title: 'Email notifications', subtitle: 'Send a copy to your inbox' },
  { key: 'notifyPayments', title: 'Payments', subtitle: 'Rent due, receipts, and arrears' },
  { key: 'notifyMaintenance', title: 'Maintenance', subtitle: 'Request and work-order updates' },
  { key: 'notifyMessages', title: 'Messages', subtitle: 'New conversation replies' },
  { key: 'notifyAnnouncements', title: 'Announcements', subtitle: 'Building-wide notices' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, isDark, toggleMode } = useTheme();
  const { user, ability, updateUser } = useAuth();

  const query = useQuery({ queryKey: ['settings'], queryFn: () => api.getSettings() });

  const [fullName, setFullName] = useState('');
  const [org, setOrg] = useState({
    name: '',
    websiteUrl: '',
    contactEmail: '',
    contactPhone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [orgErrors, setOrgErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setFullName(data.profile.fullName);
    if (data.organization) {
      setOrg({
        name: data.organization.name,
        websiteUrl: data.organization.websiteUrl ?? '',
        contactEmail: data.organization.contactEmail ?? '',
        contactPhone: data.organization.contactPhone ?? '',
        addressLine1: data.organization.addressLine1 ?? '',
        city: data.organization.city ?? '',
        state: data.organization.state ?? '',
        postalCode: data.organization.postalCode ?? '',
      });
    }
  }, [query.data]);

  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile({ fullName: fullName.trim() }),
    onSuccess: (profile) => {
      updateUser({ fullName: profile.fullName });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setNotice('Profile updated.');
    },
    onError: (err) => setError(formatApiError(err, 'Could not update your profile.')),
  });

  const saveOrg = useMutation({
    mutationFn: (payload: ReturnType<typeof updateOrganizationProfileSchema.parse>) =>
      api.updateOrganizationProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setNotice('Organization updated.');
    },
    onError: (err) => setError(formatApiError(err, 'Could not update the organization.')),
  });

  const saveNotifications = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => api.updateNotificationPreferences(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
    onError: (err) => setError(formatApiError(err, 'Could not update notifications.')),
  });

  function submitOrg() {
    setError(null);
    setNotice(null);
    const result = validate(updateOrganizationProfileSchema, org);
    if (!result.ok) {
      setOrgErrors(result.errors);
      return;
    }
    setOrgErrors({});
    saveOrg.mutate(result.data);
  }

  const settings = query.data;
  const canEditOrg = ability.can('update', 'Organization');

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader title="Settings" subtitle="Profile, organization, and app" />

      {notice ? <Banner tone="success" message={notice} /> : null}
      {error ? <Banner message={error} /> : null}

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {settings ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <AppText variant="h2">Your profile</AppText>
              <Field label="Full name" value={fullName} onChangeText={setFullName} />
              <KeyValue label="Email" value={settings.profile.email} />
              <KeyValue label="Role" value={ROLE_LABELS[settings.profile.role]} />
              <Button
                label="Save"
                variant="secondary"
                compact
                inline
                loading={saveProfile.isPending}
                disabled={!fullName.trim() || fullName.trim() === settings.profile.fullName}
                onPress={() => saveProfile.mutate()}
              />
            </Card>

            <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
              <AppText variant="h2" style={{ paddingVertical: spacing.sm }}>
                Notifications
              </AppText>
              {NOTIFICATION_ROWS.map((row, index) => (
                <View key={row.key}>
                  {index > 0 ? <Divider /> : null}
                  <ToggleRow
                    title={row.title}
                    subtitle={row.subtitle}
                    value={settings.notifications[row.key]}
                    disabled={saveNotifications.isPending}
                    onValueChange={(next) => saveNotifications.mutate({ [row.key]: next })}
                  />
                </View>
              ))}
            </Card>

            <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
              <AppText variant="h2" style={{ paddingVertical: spacing.sm }}>
                App
              </AppText>
              <ToggleRow
                title="Dark mode"
                subtitle="Easier on the eyes at night"
                value={isDark}
                onValueChange={toggleMode}
              />
              <Divider />
              <ListRow
                title="Server address"
                subtitle={getApiHostLabel()}
                icon="server-outline"
                onPress={() => router.push('/settings/server')}
              />
            </Card>

            {settings.organization ? (
              <Card>
                <Row>
                  <AppText variant="h2" style={{ flex: 1 }}>
                    Organization
                  </AppText>
                  <Badge label={SUBSCRIPTION_TIER_LABELS[settings.organization.subscriptionTier]} tone="info" />
                </Row>

                {canEditOrg ? (
                  <>
                    <Field
                      label="Company name"
                      value={org.name}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, name: text }))}
                      error={orgErrors.name}
                    />
                    <Field
                      label="Website"
                      value={org.websiteUrl}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, websiteUrl: text }))}
                      autoCapitalize="none"
                      keyboardType="url"
                      error={orgErrors.websiteUrl}
                    />
                    <Field
                      label="Contact email"
                      value={org.contactEmail}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, contactEmail: text }))}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      error={orgErrors.contactEmail}
                    />
                    <Field
                      label="Contact phone"
                      value={org.contactPhone}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, contactPhone: text }))}
                      keyboardType="phone-pad"
                      error={orgErrors.contactPhone}
                    />
                    <Field
                      label="Street address"
                      value={org.addressLine1}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, addressLine1: text }))}
                      error={orgErrors.addressLine1}
                    />
                    <Field
                      label="City"
                      value={org.city}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, city: text }))}
                      error={orgErrors.city}
                    />
                    <Field
                      label="State"
                      value={org.state}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, state: text }))}
                      error={orgErrors.state}
                    />
                    <Field
                      label="Postal code"
                      value={org.postalCode}
                      onChangeText={(text) => setOrg((prev) => ({ ...prev, postalCode: text }))}
                      error={orgErrors.postalCode}
                    />
                    <Button
                      label="Save"
                      variant="secondary"
                      compact
                      inline
                      loading={saveOrg.isPending}
                      onPress={submitOrg}
                    />
                  </>
                ) : (
                  <>
                    <KeyValue label="Name" value={settings.organization.name} />
                    {settings.organization.contactEmail ? (
                      <KeyValue label="Contact" value={settings.organization.contactEmail} />
                    ) : null}
                    <AppText variant="caption" color={colors.textSubtle}>
                      Only an organization admin can change these details.
                    </AppText>
                  </>
                )}
              </Card>
            ) : null}

            {user ? (
              <AppText variant="caption" color={colors.textSubtle} style={{ textAlign: 'center' }}>
                {user.email} · {ROLE_LABELS[user.role]}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </QueryState>
    </Screen>
  );
}
