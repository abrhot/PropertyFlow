import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  WORK_ORDER_STATUS_LABELS,
} from '@propertyflow/constants';
import type { MaintenanceRequest, WorkOrder } from '@propertyflow/types';
import { QueryState } from '@/components/data-state';
import { AppHeader } from '@/components/header';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChipSelect,
  Field,
  Row,
  Screen,
  SearchBar,
  Select,
  Sheet,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatDate, formatRelative } from '@/lib/format';
import { maintenanceTone } from '@/lib/status';
import { useTheme } from '@/features/theme/theme-context';

export default function MaintenanceScreen() {
  const { ability, sections } = useAuth();
  const canCreate = ability.can('create', 'MaintenanceRequest');

  // Technicians work a queue of jobs; staff triage requests; residents track theirs.
  if (sections.includes('work_orders')) return <WorkOrdersView canCreate={canCreate} />;
  return <RequestsView canCreate={canCreate} isStaff={sections.includes('maintenance')} />;
}

const FILTERS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Needs action', value: 'ACTION' },
  { label: 'All', value: 'ALL' },
];

function RequestsView({ canCreate, isStaff }: { canCreate: boolean; isStaff: boolean }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('OPEN');

  const query = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => api.listMaintenanceRequests(),
  });

  const summary = query.data?.summary;

  const requests = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = query.data?.requests ?? [];

    if (filter === 'OPEN') {
      list = list.filter(
        (request) => !['VERIFIED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(request.status),
      );
    } else if (filter === 'ACTION') {
      list = list.filter((request) =>
        ['SUBMITTED', 'APPROVED', 'AWAITING_VERIFICATION'].includes(request.status),
      );
    }

    if (!term) return list;
    return list.filter((request) =>
      `${request.title} ${request.description} ${request.unit.label} ${request.tenant.fullName}`
        .toLowerCase()
        .includes(term),
    );
  }, [query.data, search, filter]);

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <AppHeader
        title={isStaff ? 'Maintenance' : 'Repairs'}
        subtitle={isStaff ? 'Triage, assign, and close out requests' : 'Issues you have reported for your home'}
      />

      {isStaff && summary ? (
        <StatGrid>
          <StatCard label="Open" value={String(summary.openCount)} tone="accent" />
          <StatCard label="In progress" value={String(summary.inProgressCount)} />
          <StatCard label="Urgent" value={String(summary.urgentCount)} tone="danger" />
          <StatCard label="Total" value={String(summary.requestCount)} />
        </StatGrid>
      ) : null}

      {canCreate ? (
        <Button
          label={isStaff ? 'Log a request' : 'Report issue'}
          compact
          inline
          icon={<Ionicons name="add" size={16} color="#FFFFFF" />}
          onPress={() => router.push('/maintenance/new')}
        />
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={isStaff ? 'Search requests, units, residents' : 'Search your requests'}
      />
      <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={requests.length === 0}
        emptyIcon="construct-outline"
        emptyTitle={search ? 'No matches' : 'Nothing to show'}
        emptySubtitle={
          search
            ? 'Try a different search or filter.'
            : isStaff
              ? 'New resident requests will land here.'
              : "Report an issue and we'll get someone on it."
        }
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {requests.map((request) => (
            <Card key={request.id}>
              <Row>
                <AppText variant="title" style={{ flex: 1 }}>
                  {request.title}
                </AppText>
                <Badge
                  label={MAINTENANCE_STATUS_LABELS[request.status]}
                  tone={maintenanceTone(request.status)}
                />
              </Row>

              <AppText variant="body" color={colors.textMuted}>
                {request.description}
              </AppText>

              <Row>
                <Badge label={MAINTENANCE_PRIORITY_LABELS[request.priority]} tone="neutral" />
                <AppText variant="caption" color={colors.textSubtle} style={{ flex: 1 }}>
                  {request.unit.propertyName} · {request.unit.label} · {formatRelative(request.submittedAt)}
                </AppText>
              </Row>

              {isStaff ? (
                <AppText variant="caption" color={colors.textSubtle}>
                  Reported by {request.tenant.fullName}
                </AppText>
              ) : null}

              {request.assignee ? (
                <AppText variant="caption" color={colors.textSubtle}>
                  Assigned to {request.assignee.fullName}
                </AppText>
              ) : null}

              {isStaff ? <StaffActions request={request} /> : null}
            </Card>
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}

/**
 * The staff half of the maintenance lifecycle: approve or decline a submission,
 * assign a technician once approved, then verify the finished work.
 */
function StaffActions({ request }: { request: MaintenanceRequest }) {
  const queryClient = useQueryClient();
  const { spacing } = useTheme();
  const [assigning, setAssigning] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');

  const optionsQuery = useQuery({
    queryKey: ['maintenance', 'options'],
    queryFn: () => api.listMaintenanceOptions(),
    enabled: assigning,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
  }

  const updateStatus = useMutation({
    mutationFn: (status: MaintenanceRequest['status']) =>
      api.updateMaintenanceRequest(request.id, { status }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Update failed', formatApiError(err, 'Please try again.')),
  });

  const assign = useMutation({
    mutationFn: () =>
      api.assignWorkOrder({ maintenanceRequestId: request.id, assigneeId }),
    onSuccess: () => {
      setAssigning(false);
      setAssigneeId('');
      invalidate();
    },
    onError: (err) => Alert.alert('Could not assign', formatApiError(err, 'Please try again.')),
  });

  const assigneeOptions = (optionsQuery.data?.assignees ?? []).map((assignee) => ({
    label: assignee.fullName,
    value: assignee.id,
    hint: assignee.email,
  }));

  if (request.status === 'SUBMITTED') {
    return (
      <Row style={{ gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Approve"
            compact
            loading={updateStatus.isPending}
            onPress={() => updateStatus.mutate('APPROVED')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Decline"
            variant="secondary"
            compact
            onPress={() =>
              Alert.alert('Decline request', 'Let the resident know this will not be actioned?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Decline', style: 'destructive', onPress: () => updateStatus.mutate('REJECTED') },
              ])
            }
          />
        </View>
      </Row>
    );
  }

  if (request.status === 'APPROVED') {
    return (
      <>
        <Button label="Assign" variant="secondary" compact inline onPress={() => setAssigning(true)} />
        <Sheet open={assigning} onClose={() => setAssigning(false)} title="Assign technician">
          <View style={{ gap: spacing.md }}>
            <AppText variant="caption">
              {request.title} · {request.unit.propertyName} {request.unit.label}
            </AppText>
            <Select
              label="Technician"
              value={assigneeId}
              options={assigneeOptions}
              onChange={setAssigneeId}
              placeholder={optionsQuery.isLoading ? 'Loading team…' : 'Select a technician'}
            />
            <Button
              label="Create work order"
              compact
              inline
              loading={assign.isPending}
              disabled={!assigneeId}
              onPress={() => assign.mutate()}
            />
          </View>
        </Sheet>
      </>
    );
  }

  if (request.status === 'AWAITING_VERIFICATION') {
    return (
      <Button
        label="Verify & close"
        compact
        inline
        loading={updateStatus.isPending}
        onPress={() => updateStatus.mutate('VERIFIED')}
      />
    );
  }

  return null;
}

function WorkOrdersView({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const query = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => api.listWorkOrders(),
  });

  const workOrders = query.data?.workOrders ?? [];
  const summary = query.data?.summary;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <AppHeader title="My jobs" subtitle="Work assigned to you in the field" />

      {summary ? (
        <StatGrid>
          <StatCard label="Assigned" value={String(summary.assignedCount)} tone="accent" />
          <StatCard label="In progress" value={String(summary.inProgressCount)} tone="warning" />
          <StatCard label="Completed" value={String(summary.completedCount)} tone="success" />
        </StatGrid>
      ) : null}

      {canCreate ? (
        <Button
          label="Report"
          variant="secondary"
          compact
          inline
          icon={<Ionicons name="add" size={16} color={colors.primary} />}
          onPress={() => router.push('/maintenance/new')}
        />
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={workOrders.length === 0}
        emptyIcon="hammer-outline"
        emptyTitle="No work orders"
        emptySubtitle="Assigned jobs will show up here."
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {workOrders.map((order) => (
            <WorkOrderCard key={order.id} order={order} />
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}

function WorkOrderCard({ order }: { order: WorkOrder }) {
  const queryClient = useQueryClient();
  const { colors, spacing, radius } = useTheme();
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof api.updateWorkOrder>[1]) =>
      api.updateWorkOrder(order.id, input),
    onSuccess: () => {
      setCompleting(false);
      setNotes('');
      setPhotoUrl('');
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
    onError: (err) => Alert.alert('Update failed', formatApiError(err, 'Please try again.')),
  });

  function complete() {
    mutation.mutate({
      status: 'COMPLETED',
      completionNotes: notes.trim() || undefined,
      imageUrls: photoUrl.trim() ? [photoUrl.trim()] : undefined,
    });
  }

  return (
    <Card>
      <Row>
        <AppText variant="title" style={{ flex: 1 }}>
          {order.request.title}
        </AppText>
        <Badge
          label={WORK_ORDER_STATUS_LABELS[order.status]}
          tone={order.status === 'COMPLETED' ? 'success' : order.status === 'IN_PROGRESS' ? 'warning' : 'info'}
        />
      </Row>

      <AppText variant="caption" color={colors.textSubtle}>
        {order.request.unit.propertyName} · {order.request.unit.label} · {order.referenceCode}
        {order.dueDate ? ` · due ${formatDate(order.dueDate)}` : ''}
      </AppText>

      <Row>
        <Badge label={MAINTENANCE_PRIORITY_LABELS[order.request.priority]} tone="neutral" />
        <AppText variant="caption" color={colors.textSubtle}>
          {order.request.tenant.fullName}
        </AppText>
      </Row>

      {order.status === 'ASSIGNED' ? (
        <Button
          label="Start"
          variant="secondary"
          compact
          inline
          loading={mutation.isPending}
          onPress={() => mutation.mutate({ status: 'IN_PROGRESS' })}
        />
      ) : order.status === 'IN_PROGRESS' && !completing ? (
        <Button label="Complete" compact inline onPress={() => setCompleting(true)} />
      ) : null}

      <Sheet open={completing} onClose={() => setCompleting(false)} title="Complete job">
        <View style={{ gap: spacing.md }}>
          <Field
            label="What did you fix?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Replaced the mixer cartridge and tested for leaks."
            multiline
            style={{ minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' }}
          />
          <Field
            label="Photo proof URL (optional)"
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />
          <Button label="Submit" compact inline loading={mutation.isPending} onPress={complete} />
        </View>
      </Sheet>

      {order.completionNotes ? (
        <AppText variant="caption" color={colors.textMuted}>
          Done: {order.completionNotes}
        </AppText>
      ) : null}

      {order.imageUrls.length > 0 ? (
        <Row style={{ flexWrap: 'wrap' }}>
          {order.imageUrls.slice(0, 4).map((url) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={{ width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}
            />
          ))}
        </Row>
      ) : null}
    </Card>
  );
}
