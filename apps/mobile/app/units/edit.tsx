import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { UNIT_STATUSES, UNIT_STATUS_LABELS } from '@propertyflow/constants';
import { unitFormSchema, unitFormToRequest } from '@propertyflow/validation';
import { PageHeader } from '@/components/page-header';
import { Banner, Button, Field, Screen, Select } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { centsToInput, validate, type FieldErrors } from '@/lib/form';

const STATUS_OPTIONS = UNIT_STATUSES.map((status) => ({
  label: UNIT_STATUS_LABELS[status],
  value: status,
}));

const EMPTY = {
  label: '',
  bedrooms: '1',
  bathrooms: '1',
  squareFeet: '',
  marketRent: '',
  status: 'VACANT',
};

export default function UnitFormScreen() {
  const { propertyId, unitId } = useLocalSearchParams<{ propertyId: string; unitId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { spacing } = useTheme();

  const isEdit = Boolean(unitId);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The unit list only exists on the property detail payload, so read it there.
  const propertyQuery = useQuery({
    queryKey: ['properties', 'detail', propertyId],
    queryFn: () => api.getProperty(propertyId),
    enabled: Boolean(propertyId),
  });

  useEffect(() => {
    if (!isEdit) return;
    const unit = propertyQuery.data?.units.find((candidate) => candidate.id === unitId);
    if (!unit) return;
    setForm({
      label: unit.label,
      bedrooms: String(unit.bedrooms),
      bathrooms: String(unit.bathrooms),
      squareFeet: unit.squareFeet ? String(unit.squareFeet) : '',
      marketRent: centsToInput(unit.marketRentCents),
      status: unit.status,
    });
  }, [isEdit, propertyQuery.data, unitId]);

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof unitFormToRequest>) =>
      isEdit
        ? api.updateUnit(propertyId, unitId as string, payload)
        : api.createUnit(propertyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err, 'Could not save this unit.')),
  });

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setSubmitError(null);
    const result = validate(unitFormSchema, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(unitFormToRequest(result.data));
  }

  return (
    <Screen>
      <PageHeader
        title={isEdit ? 'Edit unit' : 'Add unit'}
        subtitle={propertyQuery.data?.name}
        backIcon="close"
      />

      {submitError ? <Banner message={submitError} /> : null}

      <View style={{ gap: spacing.md }}>
        <Field
          label="Unit label"
          value={form.label}
          onChangeText={(text) => set('label', text)}
          placeholder="Apt 2B"
          error={errors.label}
        />
        <Field
          label="Bedrooms"
          value={form.bedrooms}
          onChangeText={(text) => set('bedrooms', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={errors.bedrooms}
        />
        <Field
          label="Bathrooms"
          value={form.bathrooms}
          onChangeText={(text) => set('bathrooms', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          error={errors.bathrooms}
        />
        <Field
          label="Square feet (optional)"
          value={form.squareFeet}
          onChangeText={(text) => set('squareFeet', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={errors.squareFeet}
        />
        <Field
          label="Market rent (per month)"
          value={form.marketRent}
          onChangeText={(text) => set('marketRent', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="1850"
          error={errors.marketRent}
        />
        <Select
          label="Status"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(value) => set('status', value)}
          error={errors.status}
        />
      </View>

      <Button label={isEdit ? 'Save unit' : 'Add unit'} loading={save.isPending} onPress={submit} />
    </Screen>
  );
}
