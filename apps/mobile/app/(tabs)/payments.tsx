import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { resource } from '@propertyflow/auth';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, type PaymentStatus } from '@propertyflow/constants';
import type { Payment } from '@propertyflow/types';
import { QueryState } from '@/components/data-state';
import { AppHeader } from '@/components/header';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChipSelect,
  Divider,
  Row,
  Screen,
  SearchBar,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatCents, formatDate } from '@/lib/format';
import { paymentTone } from '@/lib/status';
import { useTheme } from '@/features/theme/theme-context';
import { useDebounced } from '@/lib/use-debounced';

const FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  ...PAYMENT_STATUSES.map((status) => ({ label: PAYMENT_STATUS_LABELS[status], value: status })),
];

export default function PaymentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, isDark } = useTheme();
  const { ability, sections } = useAuth();

  const isStaff = sections.includes('payments');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const debouncedSearch = useDebounced(search);

  const params = {
    search: debouncedSearch || undefined,
    status: filter === 'ALL' ? undefined : (filter as PaymentStatus),
  };

  const query = useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.listPayments(params),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.payPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
    onError: (err) => Alert.alert('Payment failed', formatApiError(err, 'Please try again.')),
    onSettled: () => setPayingId(null),
  });

  const payments = query.data?.payments ?? [];
  const summary = query.data?.summary;

  const nextDue = payments
    .filter((payment) => payment.status === 'PENDING' || payment.status === 'LATE')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  function canPay(payment: Payment) {
    if (payment.status === 'PAID' || payment.status === 'REFUNDED') return false;
    return ability.can(
      'pay',
      resource('Payment', {
        id: payment.id,
        organizationId: payment.organizationId,
        tenantId: payment.tenantId,
        ownerId: payment.ownerId ?? undefined,
      }),
    );
  }

  function pay(payment: Payment) {
    setPayingId(payment.id);
    payMutation.mutate(payment.id);
  }

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <AppHeader
        title={isStaff ? 'Payments' : 'Rent'}
        subtitle={isStaff ? 'Collection across your portfolio' : 'What you owe and what you have paid'}
      />

      {isStaff && summary ? (
        <StatGrid>
          <StatCard label="Collected" value={formatCents(summary.collectedCents)} tone="success" />
          <StatCard label="Outstanding" value={formatCents(summary.outstandingCents)} tone="warning" />
          <StatCard label="Collection rate" value={`${summary.collectionRate}%`} tone="accent" />
          <StatCard label="Records" value={String(summary.paymentCount)} />
        </StatGrid>
      ) : null}

      {isStaff && ability.can('create', 'Payment') ? (
        <Button
          label="Record payment"
          icon={<Ionicons name="add" size={18} color="#FFFFFF" />}
          onPress={() => router.push('/payments/record')}
        />
      ) : null}

      {!isStaff ? (
        nextDue ? (
          <Card
            style={{
              backgroundColor: isDark ? colors.surfaceElevated : colors.primary,
              borderColor: isDark ? colors.border : colors.primary,
            }}
          >
            <AppText variant="label" color="rgba(255,255,255,0.7)">
              Next rent due
            </AppText>
            <AppText variant="h1" color="#FFFFFF">
              {formatCents(nextDue.amountCents)}
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.8)">
              {nextDue.description} · due {formatDate(nextDue.dueDate)}
            </AppText>
            <Button
              label={payingId === nextDue.id ? 'Processing…' : 'Pay now'}
              variant="secondary"
              loading={payingId === nextDue.id}
              onPress={() => pay(nextDue)}
            />
          </Card>
        ) : (
          <Card style={{ backgroundColor: colors.accentMuted, borderColor: colors.accentMuted }}>
            <AppText variant="title" color={colors.success}>
              You are all caught up
            </AppText>
            <AppText variant="body" color={colors.textMuted}>
              No rent is currently due. Thanks for staying on top of it.
            </AppText>
          </Card>
        )
      ) : null}

      {isStaff ? (
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search resident, unit, reference" />
      ) : null}
      <ChipSelect options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      <View style={{ gap: spacing.md }}>
        <AppText variant="h2">{isStaff ? 'Ledger' : 'Payment history'}</AppText>

        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty={payments.length === 0}
          emptyIcon="wallet-outline"
          emptyTitle="No payments match"
          emptySubtitle={isStaff ? 'Try another status or search.' : 'Your rent history will appear here.'}
          onRetry={() => query.refetch()}
        >
          <Card style={{ gap: 0, paddingVertical: spacing.sm }}>
            {payments.map((payment, index) => (
              <View key={payment.id}>
                {index > 0 ? <Divider /> : null}
                <Row style={{ paddingVertical: spacing.md, gap: spacing.md }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="title">{formatCents(payment.amountCents)}</AppText>
                    <AppText variant="caption" color={colors.textSubtle} numberOfLines={2}>
                      {payment.description} · {formatDate(payment.dueDate)}
                    </AppText>
                    {isStaff ? (
                      <AppText variant="caption" color={colors.textSubtle} numberOfLines={1}>
                        {payment.tenant.fullName} · {payment.unit.propertyName} {payment.unit.label}
                      </AppText>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                    <Badge label={PAYMENT_STATUS_LABELS[payment.status]} tone={paymentTone(payment.status)} />
                    {canPay(payment) ? (
                      <Button
                        label={payingId === payment.id ? '…' : 'Pay'}
                        variant="ghost"
                        compact
                        loading={payingId === payment.id}
                        onPress={() => pay(payment)}
                      />
                    ) : null}
                  </View>
                </Row>
              </View>
            ))}
          </Card>
        </QueryState>
      </View>
    </Screen>
  );
}
