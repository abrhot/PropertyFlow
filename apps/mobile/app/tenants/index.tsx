import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LEASE_STATUS_LABELS } from '@propertyflow/constants';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Row,
  Screen,
  SearchBar,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';

export default function TenantsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { ability } = useAuth();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);

  const query = useQuery({
    queryKey: ['tenants', debouncedSearch],
    queryFn: () => api.listTenants({ search: debouncedSearch || undefined }),
  });

  const tenants = query.data?.tenants ?? [];
  const summary = query.data?.summary;
  const canCreate = ability.can('create', 'User');

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader
        title="Residents"
        subtitle={summary ? `${summary.tenantCount} residents` : undefined}
        action={
          canCreate ? <Button label="Add" compact onPress={() => router.push('/tenants/new')} /> : undefined
        }
      />

      {summary ? (
        <StatGrid>
          <StatCard label="Active leases" value={String(summary.activeLeases)} tone="success" />
          <StatCard label="Unplaced" value={String(summary.withoutActiveLease)} tone="warning" hint="No active lease" />
        </StatGrid>
      ) : null}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or email" />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={tenants.length === 0}
        emptyIcon="people-outline"
        emptyTitle="No residents match"
        emptySubtitle={canCreate ? 'Add a resident and optionally place them in a unit.' : undefined}
        emptyAction={
          canCreate ? <Button label="Add resident" compact onPress={() => router.push('/tenants/new')} /> : undefined
        }
        onRetry={() => query.refetch()}
      >
        <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
          {tenants.map((tenant, index) => (
            <View key={tenant.id}>
              {index > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
                <Row>
                  <Avatar name={tenant.fullName} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="title" numberOfLines={1}>
                      {tenant.fullName}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {tenant.email}
                    </AppText>
                  </View>
                  {tenant.activeLease ? (
                    <Badge label={LEASE_STATUS_LABELS[tenant.activeLease.status]} tone="success" />
                  ) : (
                    <Badge label="No lease" tone="warning" />
                  )}
                </Row>
                {tenant.activeLease ? (
                  <AppText variant="caption" color={colors.textSubtle}>
                    {tenant.activeLease.unit.propertyName} · {tenant.activeLease.unit.label} ·{' '}
                    {formatCents(tenant.activeLease.rentCents)}/mo · ends {formatDate(tenant.activeLease.endDate)}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}
