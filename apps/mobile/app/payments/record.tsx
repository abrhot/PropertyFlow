import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '@propertyflow/constants';
import { paymentFormSchema, paymentFormToCreateRequest } from '@propertyflow/validation';
import { PageHeader } from '@/components/page-header';
import { Banner, Button, DateField, Field, Screen, Select } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { validate, type FieldErrors } from '@/lib/form';

const STATUS_OPTIONS = PAYMENT_STATUSES.map((status) => ({
  label: PAYMENT_STATUS_LABELS[status],
  value: status,
}));

export default function RecordPaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { spacing } = useTheme();

  const [form, setForm] = useState({
    leaseId: '',
    amount: '',
    dueDate: '',
    description: '',
    status: 'PENDING',
    method: '',
    reference: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ['payments', 'options'],
    queryFn: () => api.listPaymentFormOptions(),
  });

  const leaseOptions = (optionsQuery.data?.leases ?? []).map((lease) => ({
    label: `${lease.propertyName} · ${lease.label}`,
    value: lease.id,
    hint: lease.tenant.fullName,
  }));

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof paymentFormToCreateRequest>) => api.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err, 'Could not record this payment.')),
  });

  /** Selecting a lease prefills amount and description from its rent. */
  function selectLease(leaseId: string) {
    const lease = optionsQuery.data?.leases.find((candidate) => candidate.id === leaseId);
    setForm((prev) => ({
      ...prev,
      leaseId,
      amount: lease ? String(lease.rentCents / 100) : prev.amount,
      description: prev.description || (lease ? `Rent · ${lease.propertyName} ${lease.label}` : ''),
    }));
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setSubmitError(null);
    const result = validate(paymentFormSchema, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(paymentFormToCreateRequest(result.data));
  }

  return (
    <Screen>
      <PageHeader title="Record payment" subtitle="Add a charge or log a receipt" backIcon="close" />

      {submitError ? <Banner message={submitError} /> : null}

      <View style={{ gap: spacing.md }}>
        <Select
          label="Lease"
          value={form.leaseId}
          options={leaseOptions}
          onChange={selectLease}
          placeholder="Select a lease"
          error={errors.leaseId}
        />
        <Field
          label="Amount"
          value={form.amount}
          onChangeText={(text) => set('amount', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="1850"
          error={errors.amount}
        />
        <DateField
          label="Due date"
          value={form.dueDate}
          onChange={(value) => set('dueDate', value)}
          error={errors.dueDate}
        />
        <Field
          label="Description"
          value={form.description}
          onChangeText={(text) => set('description', text)}
          placeholder="September rent"
          error={errors.description}
        />
        <Select
          label="Status"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(value) => set('status', value)}
          error={errors.status}
        />
        <Field
          label="Method (optional)"
          value={form.method}
          onChangeText={(text) => set('method', text)}
          placeholder="Bank transfer"
          error={errors.method}
        />
        <Field
          label="Reference (optional)"
          value={form.reference}
          onChangeText={(text) => set('reference', text)}
          autoCapitalize="characters"
          error={errors.reference}
        />
      </View>

      <Button label="Record payment" compact inline loading={save.isPending} onPress={submit} />
    </Screen>
  );
}
