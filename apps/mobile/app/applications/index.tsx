import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '@propertyflow/constants';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Badge,
  Card,
  ChipSelect,
  KeyValue,
  Row,
  Screen,
  SearchBar,
  Select,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';

const FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  ...APPLICATION_STATUSES.map((status) => ({ label: APPLICATION_STATUS_LABELS[status], value: status })),
];

const STATUS_OPTIONS = APPLICATION_STATUSES.map((status) => ({
  label: APPLICATION_STATUS_LABELS[status],
  value: status,
}));

const STATUS_TONE: Record<ApplicationStatus, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  NEW: 'info',
  SCREENING: 'warning',
  APPROVED: 'success',
  DENIED: 'danger',
  WITHDRAWN: 'neutral',
};

export default function ApplicationsScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing } = useTheme();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const debouncedSearch = useDebounced(search);

  const params = {
    search: debouncedSearch || undefined,
    status: filter === 'ALL' ? undefined : (filter as ApplicationStatus),
  };

  const query = useQuery({
    queryKey: ['applications', params],
    queryFn: () => api.listApplications(params),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.updateApplication(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
    onError: (err) => Alert.alert('Could not update', formatApiError(err, 'Please try again.')),
  });

  const applications = query.data?.applications ?? [];
  const summary = query.data?.summary;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader
        title="Inquiries"
        subtitle="Applications from your public listings"
      />

      {summary ? (
        <StatGrid>
          <StatCard label="Total" value={String(summary.applicationCount)} />
          <StatCard label="Screening" value={String(summary.screeningCount)} tone="warning" />
          <StatCard label="New" value={String(summary.newCount)} tone="accent" />
          <StatCard label="Approval rate" value={`${summary.approvalRate}%`} tone="success" />
        </StatGrid>
      ) : null}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search applicant or unit" />
      <ChipSelect options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={applications.length === 0}
        emptyIcon="clipboard-outline"
        emptyTitle="No inquiries yet"
        emptySubtitle="Interest submitted from the public homes page shows up here."
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {applications.map((application) => (
            <Card key={application.id}>
              <Row>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title" numberOfLines={1}>
                    {application.applicantName}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {application.unit.propertyName} · {application.unit.label}
                  </AppText>
                </View>
                <Badge
                  label={APPLICATION_STATUS_LABELS[application.status]}
                  tone={STATUS_TONE[application.status]}
                />
              </Row>

              <KeyValue label="Email" value={application.applicantEmail} />
              {application.applicantPhone ? (
                <KeyValue label="Phone" value={application.applicantPhone} />
              ) : null}
              <KeyValue label="Submitted" value={formatDate(application.submittedAt)} />

              {application.notes ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {application.notes}
                </AppText>
              ) : null}

              <Select
                label="Move to"
                value={application.status}
                options={STATUS_OPTIONS}
                onChange={(status) =>
                  updateStatus.mutate({ id: application.id, status: status as ApplicationStatus })
                }
              />
            </Card>
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}
