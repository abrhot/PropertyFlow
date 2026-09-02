import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { MAINTENANCE_STATUS_LABELS } from '@propertyflow/constants';
import { QueryState } from '@/components/data-state';
import { AppHeader } from '@/components/header';
import { CashFlowCard, MixCard, OccupancyCard } from '@/components/report-insights';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  ListRow,
  Row,
  Screen,
  Sparkline,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { hubEntriesFor } from '@/features/nav/sections';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatCents, formatDate, formatRelative } from '@/lib/format';

export default function HomeScreen() {
  const { user, sections } = useAuth();

  if (user?.role === 'TENANT') return <ResidentHome />;
  if (user?.role === 'MAINTENANCE' || sections.includes('work_orders')) return <TechnicianHome />;
  return <StaffHome />;
}

function daysFromNow(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ResidentHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const paymentsQuery = useQuery({ queryKey: ['payments'], queryFn: () => api.listPayments() });
  const requestsQuery = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => api.listMaintenanceRequests(),
  });
  const leasesQuery = useQuery({ queryKey: ['leases', 'mine'], queryFn: () => api.listLeases() });

  const payments = paymentsQuery.data?.payments ?? [];
  const nextDue = payments
    .filter((payment) => payment.status === 'PENDING' || payment.status === 'LATE')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const lastPaid = payments
    .filter((payment) => payment.status === 'PAID' && payment.paidAt)
    .sort((a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime())[0];

  const openRequests = (requestsQuery.data?.requests ?? [])
    .filter((request) => !['COMPLETED', 'VERIFIED', 'CANCELLED', 'REJECTED'].includes(request.status))
    .slice(0, 3);

  const lease =
    leasesQuery.data?.leases.find((item) => item.status === 'ACTIVE') ?? leasesQuery.data?.leases[0];
  const rentDays = nextDue ? daysFromNow(nextDue.dueDate) : null;
  const leaseDays = lease ? daysFromNow(lease.endDate) : null;
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? 'Resident';

  function refetchAll() {
    void paymentsQuery.refetch();
    void requestsQuery.refetch();
    void leasesQuery.refetch();
  }

  const isLoading = paymentsQuery.isLoading || requestsQuery.isLoading || leasesQuery.isLoading;
  const error = paymentsQuery.error ?? requestsQuery.error ?? leasesQuery.error;

  return (
    <Screen onRefresh={refetchAll} refreshing={paymentsQuery.isFetching && !isLoading}>
      <AppHeader
        greeting="Welcome back"
        title={firstName}
        subtitle={lease ? `${lease.unit.label} · ${lease.unit.propertyName}` : undefined}
      />

      <QueryState isLoading={isLoading} error={error} onRetry={refetchAll}>
        <View style={{ gap: spacing.xl }}>
          {nextDue ? (
            <Pressable onPress={() => router.push('/(tabs)/payments')}>
              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={colors.textSubtle}>
                  {rentDays !== null && rentDays < 0 ? 'Overdue' : 'Rent due'}
                </AppText>
                <AppText variant="h1">{formatCents(nextDue.amountCents)}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {rentDays !== null && rentDays < 0
                    ? `${Math.abs(rentDays)} days late · ${formatDate(nextDue.dueDate)}`
                    : rentDays === 0
                      ? `Due today · ${nextDue.description}`
                      : `In ${rentDays} days · ${formatDate(nextDue.dueDate)}`}
                </AppText>
              </View>
            </Pressable>
          ) : (
            <View style={{ gap: 6 }}>
              <AppText variant="caption" color={colors.textSubtle}>
                Rent
              </AppText>
              <AppText variant="h2">Current</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {lastPaid
                  ? `Last paid ${formatCents(lastPaid.amountCents)} · ${formatDate(lastPaid.paidAt)}`
                  : 'Nothing is due right now'}
              </AppText>
            </View>
          )}

          {lease ? (
            <Pressable onPress={() => router.push('/lease')} style={{ gap: 10 }}>
              <Row>
                <AppText variant="caption" color={colors.textSubtle} style={{ flex: 1 }}>
                  Lease
                </AppText>
                <AppText variant="caption" color={leaseDays !== null && leaseDays <= 45 ? colors.danger : colors.textMuted}>
                  {leaseDays === null
                    ? formatDate(lease.endDate)
                    : leaseDays < 0
                      ? 'Ended'
                      : leaseDays <= 45
                        ? `${leaseDays} days left`
                        : `Ends ${formatDate(lease.endDate)}`}
                </AppText>
              </Row>
              <View style={{ height: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${leaseProgress(lease.startDate, lease.endDate)}%`,
                    height: 2,
                    backgroundColor: leaseDays !== null && leaseDays <= 45 ? colors.danger : colors.accent,
                  }}
                />
              </View>
              <Row>
                <AppText variant="caption" color={colors.textMuted}>
                  {formatCents(lease.rentCents)} / month
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                </AppText>
              </Row>
            </Pressable>
          ) : null}

          <View style={{ flexDirection: 'row' }}>
            <HomeAction
              icon="add-outline"
              label="Report"
              onPress={() => router.push('/maintenance/new')}
            />
            <HomeAction icon="document-text-outline" label="Lease" onPress={() => router.push('/lease')} />
            <HomeAction
              icon="card-outline"
              label="Pay"
              onPress={() => router.push('/(tabs)/payments')}
            />
            <HomeAction
              icon="chatbubble-outline"
              label="Chat"
              onPress={() => router.push('/conversation/new')}
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <Row>
              <AppText variant="h2" style={{ flex: 1 }}>
                Requests
              </AppText>
              <Pressable onPress={() => router.push('/(tabs)/maintenance')} hitSlop={8}>
                <AppText variant="caption" color={colors.textMuted}>
                  All
                </AppText>
              </Pressable>
            </Row>

            {openRequests.length === 0 ? (
              <AppText variant="caption" color={colors.textSubtle}>
                No open issues
              </AppText>
            ) : (
              <View>
                {openRequests.map((request, index) => (
                  <Pressable
                    key={request.id}
                    onPress={() => router.push('/(tabs)/maintenance')}
                    style={{
                      paddingVertical: spacing.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="title" numberOfLines={1}>
                        {request.title}
                      </AppText>
                      <AppText variant="caption" color={colors.textSubtle}>
                        {formatRelative(request.submittedAt)}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={colors.textMuted}>
                      {MAINTENANCE_STATUS_LABELS[request.status]}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </QueryState>
    </Screen>
  );
}

function leaseProgress(start: string, end: string) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (to <= from) return 100;
  return Math.max(4, Math.min(100, ((Date.now() - from) / (to - from)) * 100));
}

function HomeAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
        pressed ? { opacity: 0.55 } : undefined,
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TechnicianHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const query = useQuery({ queryKey: ['work-orders'], queryFn: () => api.listWorkOrders() });

  const active = (query.data?.workOrders ?? []).filter((order) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(order.status),
  );
  const summary = query.data?.summary;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <AppHeader
        greeting="Welcome back,"
        title={user?.fullName ?? 'Technician'}
        subtitle={active.length === 1 ? '1 job needs you' : `${active.length} jobs need you`}
      />

      {summary ? (
        <>
          <StatGrid>
            <StatCard label="Assigned" value={String(summary.assignedCount)} tone="accent" />
            <StatCard label="In progress" value={String(summary.inProgressCount)} tone="warning" />
            <StatCard label="Completed" value={String(summary.completedCount)} tone="success" />
          </StatGrid>
          <MixCard
            title="Workload"
            subtitle="How your jobs break down"
            rows={[
              { label: 'Assigned', value: summary.assignedCount, tone: colors.accent },
              { label: 'In progress', value: summary.inProgressCount, tone: colors.warning },
              { label: 'Completed', value: summary.completedCount, tone: colors.success },
            ]}
          />
        </>
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={active.length === 0}
        emptyIcon="hammer-outline"
        emptyTitle="No active jobs"
        emptySubtitle="New assignments will show up here."
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {active.slice(0, 5).map((order) => (
            <Card key={order.id} onPress={() => router.push('/(tabs)/maintenance')}>
              <Row>
                <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
                  {order.request.title}
                </AppText>
                <Badge
                  label={order.status === 'IN_PROGRESS' ? 'In progress' : 'Assigned'}
                  tone={order.status === 'IN_PROGRESS' ? 'warning' : 'info'}
                />
              </Row>
              <AppText variant="caption" color={colors.textSubtle}>
                {order.request.unit.propertyName} · {order.request.unit.label} · {order.referenceCode}
              </AppText>
            </Card>
          ))}
        </View>
      </QueryState>

      <Button
        label="Open jobs"
        variant="secondary"
        compact
        inline
        onPress={() => router.push('/(tabs)/maintenance')}
      />
    </Screen>
  );
}

/** Manager / admin / owner landing: the same metrics the web dashboard shows. */
function StaffHome() {
  const { user, sections, ability } = useAuth();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const reportsQuery = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.getReportDashboard(),
    enabled: sections.includes('reports'),
  });

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.listProperties(),
    enabled: sections.includes('properties') && !sections.includes('reports'),
  });

  const needsApproval = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => api.listMaintenanceRequests(),
    enabled: sections.includes('maintenance'),
  });

  const trend = summaryQuery.data?.trend;
  const points = (trend?.points ?? []).slice(-30);
  const pending = (needsApproval.data?.requests ?? []).filter((request) =>
    ['SUBMITTED', 'AWAITING_VERIFICATION'].includes(request.status),
  );

  const shortcuts = hubEntriesFor(sections, ability.can('read', 'Lease')).slice(0, 6);
  const occupancyFromProperties = (propertiesQuery.data?.properties ?? []).map((property) => ({
    property: property.name,
    occupancy: property.stats.occupancyRate,
  }));

  return (
    <Screen onRefresh={() => summaryQuery.refetch()} refreshing={summaryQuery.isFetching && !summaryQuery.isLoading}>
      <AppHeader
        greeting="Welcome back,"
        title={user?.fullName ?? 'Team'}
        subtitle="Your portfolio at a glance"
      />

      <QueryState
        isLoading={summaryQuery.isLoading}
        error={summaryQuery.error}
        onRetry={() => summaryQuery.refetch()}
      >
        <View style={{ gap: spacing.lg }}>
          <StatGrid>
            {(summaryQuery.data?.metrics ?? []).map((metric) => (
              <StatCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                hint={metric.hint}
                tone={metric.trend === 'up' ? 'success' : metric.trend === 'down' ? 'danger' : 'neutral'}
              />
            ))}
          </StatGrid>

          {reportsQuery.data ? (
            <>
              <CashFlowCard cashFlow={reportsQuery.data.cashFlow} />
              <OccupancyCard occupancy={reportsQuery.data.occupancy} />
            </>
          ) : (
            <>
              {trend && points.length > 0 ? (
                <Card>
                  <AppText variant="h2">{trend.title}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {trend.subtitle}
                  </AppText>
                  <Sparkline values={points.map((point) => point.primary)} />
                  <Row style={{ justifyContent: 'space-between' }}>
                    <AppText variant="caption" color={colors.textSubtle}>
                      {formatDate(points[0]?.date)}
                    </AppText>
                    <AppText variant="caption" color={colors.textSubtle}>
                      {trend.primaryLabel}
                    </AppText>
                  </Row>
                </Card>
              ) : null}
              {occupancyFromProperties.length > 0 ? (
                <OccupancyCard occupancy={occupancyFromProperties} />
              ) : null}
            </>
          )}

          {pending.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <AppText variant="h2">Needs your attention</AppText>
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {pending.slice(0, 4).map((request, index) => (
                  <View key={request.id}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow
                      title={request.title}
                      subtitle={`${request.unit.propertyName} · ${request.unit.label} · ${request.tenant.fullName}`}
                      icon="alert-circle-outline"
                      iconTone={colors.warning}
                      onPress={() => router.push('/(tabs)/maintenance')}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          <View style={{ gap: spacing.md }}>
            <AppText variant="h2">Jump to</AppText>
            <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
              {shortcuts.map((entry, index) => (
                <View key={entry.section}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={entry.label}
                    subtitle={entry.description}
                    icon={entry.icon}
                    onPress={() => router.push(entry.href as Href)}
                  />
                </View>
              ))}
            </Card>
          </View>
        </View>
      </QueryState>
    </Screen>
  );
}
