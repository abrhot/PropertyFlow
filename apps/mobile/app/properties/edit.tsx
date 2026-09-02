import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@propertyflow/constants';
import { createPropertySchema } from '@propertyflow/validation';
import { PageHeader } from '@/components/page-header';
import { AppText, Banner, Button, Field, Screen, Select } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { validate, type FieldErrors } from '@/lib/form';

const TYPE_OPTIONS = PROPERTY_TYPES.map((type) => ({
  label: PROPERTY_TYPE_LABELS[type],
  value: type,
}));

const EMPTY = {
  name: '',
  type: 'APARTMENT',
  ownerId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  yearBuilt: '',
  imageUrl: '',
  notes: '',
};

export default function PropertyFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { spacing } = useTheme();

  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ownersQuery = useQuery({
    queryKey: ['property-owners'],
    queryFn: () => api.listPropertyOwners(),
  });

  const existingQuery = useQuery({
    queryKey: ['properties', 'detail', id],
    queryFn: () => api.getProperty(id as string),
    enabled: isEdit,
  });

  // Seed the form once the existing property arrives.
  useEffect(() => {
    const property = existingQuery.data;
    if (!property) return;
    setForm({
      name: property.name,
      type: property.type,
      ownerId: property.ownerId ?? '',
      addressLine1: property.addressLine1,
      addressLine2: property.addressLine2 ?? '',
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      country: property.country,
      yearBuilt: property.yearBuilt ? String(property.yearBuilt) : '',
      imageUrl: property.imageUrl ?? '',
      notes: property.notes ?? '',
    });
  }, [existingQuery.data]);

  const ownerOptions = [
    { label: 'Unassigned', value: '' },
    ...(ownersQuery.data ?? []).map((owner) => ({
      label: owner.fullName,
      value: owner.id,
      hint: owner.email,
    })),
  ];

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof createPropertySchema.parse>) =>
      isEdit ? api.updateProperty(id as string, payload) : api.createProperty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err, 'Could not save this property.')),
  });

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setSubmitError(null);
    const result = validate(createPropertySchema, form);
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
        title={isEdit ? 'Edit property' : 'Add property'}
        subtitle="Buildings hold the units you lease"
        backIcon="close"
      />

      {submitError ? <Banner message={submitError} /> : null}

      <View style={{ gap: spacing.md }}>
        <Field
          label="Property name"
          value={form.name}
          onChangeText={(text) => set('name', text)}
          placeholder="Riverside Apartments"
          error={errors.name}
        />
        <Select
          label="Type"
          value={form.type}
          options={TYPE_OPTIONS}
          onChange={(value) => set('type', value)}
          error={errors.type}
        />
        <Select
          label="Owner"
          value={form.ownerId}
          options={ownerOptions}
          onChange={(value) => set('ownerId', value)}
          placeholder="Unassigned"
          error={errors.ownerId}
        />

        <AppText variant="h2" style={{ marginTop: spacing.sm }}>
          Address
        </AppText>
        <Field
          label="Street address"
          value={form.addressLine1}
          onChangeText={(text) => set('addressLine1', text)}
          placeholder="120 Riverside Drive"
          error={errors.addressLine1}
        />
        <Field
          label="Unit / suite (optional)"
          value={form.addressLine2}
          onChangeText={(text) => set('addressLine2', text)}
          error={errors.addressLine2}
        />
        <Field
          label="City"
          value={form.city}
          onChangeText={(text) => set('city', text)}
          error={errors.city}
        />
        <Field
          label="State or region"
          value={form.state}
          onChangeText={(text) => set('state', text)}
          error={errors.state}
        />
        <Field
          label="Postal code"
          value={form.postalCode}
          onChangeText={(text) => set('postalCode', text)}
          error={errors.postalCode}
        />
        <Field
          label="Country code"
          value={form.country}
          onChangeText={(text) => set('country', text.toUpperCase())}
          maxLength={2}
          autoCapitalize="characters"
          error={errors.country}
        />

        <AppText variant="h2" style={{ marginTop: spacing.sm }}>
          Details
        </AppText>
        <Field
          label="Year built (optional)"
          value={form.yearBuilt}
          onChangeText={(text) => set('yearBuilt', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={errors.yearBuilt}
        />
        <Field
          label="Cover image URL (optional)"
          value={form.imageUrl}
          onChangeText={(text) => set('imageUrl', text)}
          autoCapitalize="none"
          keyboardType="url"
          error={errors.imageUrl}
        />
        <Field
          label="Notes (optional)"
          value={form.notes}
          onChangeText={(text) => set('notes', text)}
          multiline
          style={{ minHeight: 100, paddingTop: spacing.md, textAlignVertical: 'top' }}
          error={errors.notes}
        />
      </View>

      <Button
        label={isEdit ? 'Save changes' : 'Create property'}
        loading={save.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
