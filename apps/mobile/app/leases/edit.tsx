import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { LEASE_STATUSES, LEASE_STATUS_LABELS } from '@propertyflow/constants';
import {
  leaseFormSchema,
  leaseFormToCreateRequest,
  leaseFormToUpdateRequest,
} from '@propertyflow/validation';
import { PageHeader } from '@/components/page-header';
import { Banner, Button, DateField, Field, Screen, Select } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { centsToInput, toDateInput, validate, type FieldErrors } from '@/lib/form';

const STATUS_OPTIONS = LEASE_STATUSES.map((status) => ({
  label: LEASE_STATUS_LABELS[status],
  value: status,
}));

const EMPTY = {
  unitId: '',
  tenantId: '',
  status: 'DRAFT',
  startDate: '',
  endDate: '',
  rent: '',
  deposit: '0',
  notes: '',
};

export default function LeaseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { spacing } = useTheme();

  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ['leases', 'options'],
    queryFn: () => api.listLeaseFormOptions(),
  });

  const existingQuery = useQuery({
    queryKey: ['leases', 'detail', id],
    queryFn: () => api.getLease(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    const lease = existingQuery.data;
    if (!lease) return;
    setForm({
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      status: lease.status,
      startDate: toDateInput(lease.startDate),
      endDate: toDateInput(lease.endDate),
      rent: centsToInput(lease.rentCents),
      deposit: centsToInput(lease.depositCents),
      notes: lease.notes ?? '',
    });
  }, [existingQuery.data]);

  const unitOptions = (optionsQuery.data?.units ?? []).map((unit) => ({
    label: `${unit.propertyName} · ${unit.label}`,
    value: unit.id,
  }));
  const tenantOptions = (optionsQuery.data?.tenants ?? []).map((tenant) => ({
    label: tenant.fullName,
    value: tenant.id,
    hint: tenant.email,
  }));

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof leaseFormSchema.parse>) =>
      isEdit
        ? api.updateLease(id as string, leaseFormToUpdateRequest(payload))
        : api.createLease(leaseFormToCreateRequest(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err, 'Could not save this lease.')),
  });

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setSubmitError(null);
    const result = validate(leaseFormSchema, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(result.data);
  }

  return (
    <Screen>
      <PageHeader
        title={isEdit ? 'Edit lease' : 'New lease'}
        subtitle="Places a resident in a unit"
        backIcon="close"
      />

      {submitError ? <Banner message={submitError} /> : null}

      <View style={{ gap: spacing.md }}>
        <Select
          label="Unit"
          value={form.unitId}
          options={unitOptions}
          onChange={(value) => set('unitId', value)}
          placeholder="Select a unit"
          disabled={isEdit}
          error={errors.unitId}
        />
        <Select
          label="Resident"
          value={form.tenantId}
          options={tenantOptions}
          onChange={(value) => set('tenantId', value)}
          placeholder="Select a resident"
          error={errors.tenantId}
        />
        <Select
          label="Status"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(value) => set('status', value)}
          error={errors.status}
        />
        <DateField
          label="Start date"
          value={form.startDate}
          onChange={(value) => set('startDate', value)}
          error={errors.startDate}
        />
        <DateField
          label="End date"
          value={form.endDate}
          onChange={(value) => set('endDate', value)}
          error={errors.endDate}
        />
        <Field
          label="Monthly rent"
          value={form.rent}
          onChangeText={(text) => set('rent', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="1850"
          error={errors.rent}
        />
        <Field
          label="Security deposit"
          value={form.deposit}
          onChangeText={(text) => set('deposit', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          error={errors.deposit}
        />
        <Field
          label="Agreement notes (optional)"
          value={form.notes}
          onChangeText={(text) => set('notes', text)}
          multiline
          style={{ minHeight: 100, paddingTop: spacing.md, textAlignVertical: 'top' }}
          error={errors.notes}
        />
      </View>

      <Button label={isEdit ? 'Save lease' : 'Create lease'} loading={save.isPending} onPress={submit} />
    </Screen>
  );
}
