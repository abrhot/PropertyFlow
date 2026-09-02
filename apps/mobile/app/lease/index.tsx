import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { LEASE_STATUS_LABELS } from '@propertyflow/constants';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import { AppText, Badge, Card, KeyValue, Row, Screen, StatCard, StatGrid } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';

/** The resident's own lease — mirrors the web "My lease" page. */
export default function MyLeaseScreen() {
  const { colors, spacing } = useTheme();

  const query = useQuery({
    queryKey: ['leases', 'mine'],
    queryFn: () => api.listLeases(),
  });

  const leases = query.data?.leases ?? [];
  const lease = leases.find((candidate) => candidate.status === 'ACTIVE') ?? leases[0];

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader title="My lease" subtitle="Your agreement and home" />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={!lease}
        emptyIcon="home-outline"
        emptyTitle="No lease on file"
        emptySubtitle="Once your manager places you in a home, the agreement appears here."
        onRetry={() => query.refetch()}
      >
        {lease ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <Row>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="h2">{lease.unit.propertyName}</AppText>
                  <AppText variant="body" color={colors.textMuted}>
                    Unit {lease.unit.label}
                  </AppText>
                </View>
                <Badge label={LEASE_STATUS_LABELS[lease.status]} tone={lease.status === 'ACTIVE' ? 'success' : 'neutral'} />
              </Row>
            </Card>

            <StatGrid>
              <StatCard label="Monthly rent" value={formatCents(lease.rentCents)} tone="accent" />
              <StatCard label="Deposit held" value={formatCents(lease.depositCents)} />
            </StatGrid>

            <Card>
              <AppText variant="h2">Term</AppText>
              <KeyValue label="Starts" value={formatDate(lease.startDate)} />
              <KeyValue label="Ends" value={formatDate(lease.endDate)} />
            </Card>

            {lease.notes ? (
              <Card>
                <AppText variant="h2">Agreement notes</AppText>
                <AppText variant="body" color={colors.textMuted}>
                  {lease.notes}
                </AppText>
              </Card>
            ) : null}
          </View>
        ) : null}
      </QueryState>
    </Screen>
  );
}
