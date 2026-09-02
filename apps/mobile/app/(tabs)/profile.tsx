import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { LEASE_STATUS_LABELS } from '@propertyflow/constants';
import { AppHeader } from '@/components/header';
import {
  AppText,
  Avatar,
  Badge,
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
import { formatCents, formatDate } from '@/lib/format';
import { getApiHostLabel } from '@/lib/server-config';

const FRIENDLY_ROLE: Record<string, string> = {
  TENANT: 'Resident',
  OWNER: 'Homeowner',
  MAINTENANCE: 'Technician',
  PROPERTY_MANAGER: 'Property manager',
  ORG_ADMIN: 'Company admin',
};

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const router = useRouter();
  const { colors, spacing, isDark, toggleMode } = useTheme();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const saveName = useMutation({
    mutationFn: (fullName: string) => api.updateProfile({ fullName }),
    onSuccess: (profile) => {
      updateUser({ fullName: profile.fullName });
      setEditing(false);
    },
    onError: (err) => Alert.alert('Update failed', formatApiError(err, 'Please try again.')),
  });

  const leases = useQuery({
    queryKey: ['leases', 'mine'],
    queryFn: () => api.listLeases(),
    enabled: user?.role === 'TENANT',
  });

  if (!user) return null;

  const lease = leases.data?.leases.find((item) => item.status === 'ACTIVE') ?? leases.data?.leases[0];

  function confirmSignOut() {
    Alert.alert('Sign out', 'Sign out of PropertyFlow on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <AppHeader title="Me" subtitle="Your account and app preferences" />

      <Card>
        <Row style={{ gap: spacing.md }}>
          <Avatar name={user.fullName} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">{user.fullName}</AppText>
            <AppText variant="caption" color={colors.textSubtle}>
              {user.email}
            </AppText>
          </View>
          {!editing ? (
            <Ionicons
              name="create-outline"
              size={20}
              color={colors.textSubtle}
              onPress={() => {
                setName(user.fullName);
                setEditing(true);
              }}
            />
          ) : null}
        </Row>

        {editing ? (
          <View style={{ gap: spacing.sm }}>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <Row style={{ gap: spacing.sm }}>
              <Button
                label="Cancel"
                variant="ghost"
                compact
                inline
                disabled={saveName.isPending}
                onPress={() => setEditing(false)}
              />
              <Button
                label="Save"
                compact
                inline
                loading={saveName.isPending}
                disabled={!name.trim()}
                onPress={() => saveName.mutate(name.trim())}
              />
            </Row>
          </View>
        ) : null}

        <Divider />
        <Badge label={FRIENDLY_ROLE[user.role] ?? user.role} tone="info" />
      </Card>

      {user.role === 'TENANT' ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="h2">My home</AppText>
          {lease ? (
            <Card onPress={() => router.push('/lease')}>
              <Row>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title">{lease.unit.propertyName}</AppText>
                  <AppText variant="caption" color={colors.textSubtle}>
                    {lease.unit.label}
                  </AppText>
                </View>
                <Badge label={LEASE_STATUS_LABELS[lease.status]} tone="success" />
              </Row>
              <Divider />
              <KeyValue label="Monthly rent" value={formatCents(lease.rentCents)} />
              <KeyValue
                label="Lease term"
                value={`${formatDate(lease.startDate)} – ${formatDate(lease.endDate)}`}
              />
              <AppText variant="caption" color={colors.accent}>
                View full lease
              </AppText>
            </Card>
          ) : leases.isLoading ? (
            <AppText variant="body" color={colors.textMuted}>
              Loading your home…
            </AppText>
          ) : (
            <AppText variant="body" color={colors.textMuted}>
              No lease is connected to this account yet.
            </AppText>
          )}
        </View>
      ) : null}

      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
        <ListRow
          title="Ask PropertyFlow"
          subtitle="AI help for homes, leases, rent, and repairs"
          icon="sparkles-outline"
          onPress={() => router.push('/assistant')}
        />
        <Divider />
        <ToggleRow
          title="Dark mode"
          subtitle={isDark ? 'Dark theme' : 'Light theme'}
          value={isDark}
          onValueChange={toggleMode}
        />
        <Divider />
        <ListRow
          title="Settings"
          subtitle="Profile, notifications, and organization"
          icon="settings-outline"
          onPress={() => router.push('/settings')}
        />
        <Divider />
        <ListRow
          title="Server address"
          subtitle={getApiHostLabel()}
          icon="server-outline"
          onPress={() => router.push('/settings/server')}
        />
        <Divider />
        <ListRow
          title="Notifications"
          subtitle="Recent activity on your account"
          icon="notifications-outline"
          onPress={() => router.push('/notifications')}
        />
      </Card>

      <Button
        label="Sign out"
        variant="secondary"
        compact
        inline
        icon={<Ionicons name="log-out-outline" size={16} color={colors.text} />}
        onPress={confirmSignOut}
      />
    </Screen>
  );
}
