import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { resource } from '@propertyflow/auth';
import { LEASE_STATUSES, LEASE_STATUS_LABELS, type LeaseStatus } from '@propertyflow/constants';
import type { Lease } from '@propertyflow/types';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChipSelect,
  Row,
  Screen,
  SearchBar,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatCents, formatDate } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';

const STATUS_OPTIONS = [
  { label: 'All', value: 'ALL' },
  ...LEASE_STATUSES.map((status) => ({ label: LEASE_STATUS_LABELS[status], value: status })),
];

const STATUS_TONE: Record<LeaseStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  ACTIVE: 'success',
  PENDING_SIGNATURE: 'warning',
  DRAFT: 'neutral',
  EXPIRED: 'neutral',
  TERMINATED: 'danger',
};

export default function LeasesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing } = useTheme();
  const { ability } = useAuth();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const debouncedSearch = useDebounced(search);

  const params = {
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : (status as LeaseStatus),
  };

  const query = useQuery({
    queryKey: ['leases', params],
    queryFn: () => api.listLeases(params),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLease(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
    onError: (err) => Alert.alert('Could not delete lease', formatApiError(err, 'Please try again.')),
  });

  const leases = query.data?.leases ?? [];
  const summary = query.data?.summary;
  const canCreate = ability.can('create', 'Lease');

  function canEdit(lease: Lease) {
    return ability.can(
      'update',
      resource('Lease', {
        id: lease.id,
        organizationId: lease.organizationId,
        tenantId: lease.tenantId,
        ownerId: lease.ownerId ?? undefined,
      }),
    );
  }

  function confirmDelete(lease: Lease) {
    Alert.alert('Delete lease', `Remove the lease for ${lease.tenant.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(lease.id) },
    ]);
  }

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader
        title="Leases"
        subtitle={summary ? `${summary.activeLeases} active of ${summary.leaseCount}` : undefined}
        action={
          canCreate ? <Button label="New" compact onPress={() => router.push('/leases/edit')} /> : undefined
        }
      />

      {summary ? (
        <StatGrid>
          <StatCard label="Active leases" value={String(summary.activeLeases)} tone="accent" />
          <StatCard label="Monthly rent" value={formatCents(summary.monthlyRentCents)} hint="From active leases" />
        </StatGrid>
      ) : null}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search resident or unit" />
      <ChipSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={leases.length === 0}
        emptyIcon="document-text-outline"
        emptyTitle="No leases match"
        emptySubtitle={canCreate ? 'Create a lease to place a resident in a unit.' : undefined}
        emptyAction={
          canCreate ? <Button label="Create lease" compact onPress={() => router.push('/leases/edit')} /> : undefined
        }
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {leases.map((lease) => (
            <Card key={lease.id}>
              <Row>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title" numberOfLines={1}>
                    {lease.tenant.fullName}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {lease.unit.propertyName} · {lease.unit.label}
                  </AppText>
                </View>
                <Badge label={LEASE_STATUS_LABELS[lease.status]} tone={STATUS_TONE[lease.status]} />
              </Row>

              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ gap: 1 }}>
                  <AppText variant="caption" color={colors.textSubtle}>
                    TERM
                  </AppText>
                  <AppText variant="label">
                    {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                  </AppText>
                </View>
                <View style={{ gap: 1, alignItems: 'flex-end' }}>
                  <AppText variant="caption" color={colors.textSubtle}>
                    RENT
                  </AppText>
                  <AppText variant="label">{formatCents(lease.rentCents)}/mo</AppText>
                </View>
              </Row>

              {canEdit(lease) ? (
                <Row>
                  <Button
                    label="Edit"
                    variant="secondary"
                    compact
                    onPress={() => router.push({ pathname: '/leases/edit', params: { id: lease.id } })}
                  />
                  <Button label="Delete" variant="ghost" compact onPress={() => confirmDelete(lease)} />
                </Row>
              ) : null}
            </Card>
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}
