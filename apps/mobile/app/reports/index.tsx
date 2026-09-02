import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import { CashFlowCard, OccupancyCard } from '@/components/report-insights';
import {
  AppText,
  Badge,
  Card,
  Divider,
  Row,
  Screen,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';

export default function ReportsScreen() {
  const { colors, spacing } = useTheme();

  const query = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.getReportDashboard(),
  });

  const data = query.data;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader title="Reports" subtitle="Cash flow and occupancy" />

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <View style={{ gap: spacing.lg }}>
            <StatGrid>
              <StatCard label="Collected" value={formatCents(data.summary.collectedCents)} tone="success" />
              <StatCard label="Outstanding" value={formatCents(data.summary.outstandingCents)} tone="warning" />
              <StatCard label="Occupancy" value={`${data.summary.occupancyRate}%`} tone="accent" />
            </StatGrid>

            <CashFlowCard cashFlow={data.cashFlow} />
            <OccupancyCard occupancy={data.occupancy} />

            <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
              <AppText variant="h2" style={{ paddingVertical: spacing.sm }}>
                Saved reports
              </AppText>
              {data.reports.map((report, index) => (
                <View key={report.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row style={{ paddingVertical: spacing.md }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="title" numberOfLines={1}>
                        {report.report}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted}>
                        {report.category} · {report.period} · {report.generated}
                      </AppText>
                    </View>
                    <Badge label={report.status} tone="success" />
                  </Row>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </QueryState>
    </Screen>
  );
}
