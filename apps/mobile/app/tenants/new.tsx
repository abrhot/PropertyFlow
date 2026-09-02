import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { createTenantSchema } from '@propertyflow/validation';
import type { CreateTenantRequest, CreateTenantResponse } from '@propertyflow/types';
import { PageHeader } from '@/components/page-header';
import { AppText, Banner, Button, Card, DateField, Field, Row, Screen, Select } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { validate, type FieldErrors } from '@/lib/form';

export default function NewTenantScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing } = useTheme();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    unitId: '',
    rent: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateTenantResponse | null>(null);

  const optionsQuery = useQuery({
    queryKey: ['leases', 'options'],
    queryFn: () => api.listLeaseFormOptions(),
  });

  const unitOptions = [
    { label: 'Do not place in a unit yet', value: '' },
    ...(optionsQuery.data?.units ?? []).map((unit) => ({
      label: `${unit.propertyName} · ${unit.label}`,
      value: unit.id,
    })),
  ];

  const save = useMutation({
    mutationFn: (payload: CreateTenantRequest) => api.createTenant(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setCreated(response);
    },
    onError: (err) => setSubmitError(formatApiError(err, 'Could not add this resident.')),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setSubmitError(null);
    // Rent is typed in whole currency but the API takes cents.
    const candidate = {
      fullName: form.fullName,
      email: form.email,
      unitId: form.unitId,
      rentCents: form.rent ? Math.round(Number(form.rent) * 100) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };
    const result = validate(createTenantSchema, candidate);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // The schema parses dates into `Date`; the wire format is ISO strings.
    save.mutate({
      ...result.data,
      startDate: result.data.startDate?.toISOString(),
      endDate: result.data.endDate?.toISOString(),
    });
  }

  if (created) {
    return (
      <Screen>
        <PageHeader title="Resident added" subtitle={created.tenant.fullName} backIcon="close" />
        <Banner
          tone="success"
          message={`${created.tenant.fullName} can now sign in with ${created.tenant.email}.`}
        />
        <Card>
          <AppText variant="label" color={colors.textMuted}>
            One-time password
          </AppText>
          <AppText variant="h2" selectable style={{ letterSpacing: 1 }}>
            {created.temporaryPassword}
          </AppText>
          <AppText variant="caption" color={colors.textSubtle}>
            Long-press to copy. Share it once — they should change it after their first sign-in.
          </AppText>
        </Card>
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Add resident" subtitle="Creates an account they can sign in with" backIcon="close" />

      {submitError ? <Banner message={submitError} /> : null}

      <View style={{ gap: spacing.md }}>
        <Field
          label="Full name"
          value={form.fullName}
          onChangeText={(text) => set('fullName', text)}
          error={errors.fullName}
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(text) => set('email', text)}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />

        <AppText variant="h2" style={{ marginTop: spacing.sm }}>
          Placement
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Choosing a unit also creates an active lease so they appear in their home right away.
        </AppText>

        <Select
          label="Unit"
          value={form.unitId}
          options={unitOptions}
          onChange={(value) => set('unitId', value)}
          placeholder="Do not place in a unit yet"
          error={errors.unitId}
        />

        {form.unitId ? (
          <>
            <Field
              label="Monthly rent"
              value={form.rent}
              onChangeText={(text) => set('rent', text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="1850"
              error={errors.rentCents}
            />
            <Row style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Lease start"
                  value={form.startDate}
                  onChange={(value) => set('startDate', value)}
                  error={errors.startDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Lease end"
                  value={form.endDate}
                  onChange={(value) => set('endDate', value)}
                  error={errors.endDate}
                />
              </View>
            </Row>
          </>
        ) : null}
      </View>

      <Button label="Add resident" loading={save.isPending} onPress={submit} />
    </Screen>
  );
}
