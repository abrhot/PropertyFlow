import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_PRIORITY_LABELS } from '@propertyflow/constants';
import type { MaintenancePriority } from '@propertyflow/constants';
import { createMaintenanceRequestSchema } from '@propertyflow/validation';
import { AppText, Button, Card, Field, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/features/theme/theme-context';

export default function NewMaintenanceRequest() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: options } = useQuery({
    queryKey: ['maintenance-options'],
    queryFn: () => api.listMaintenanceOptions(),
  });

  const [leaseId, setLeaseId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('NORMAL');
  const [error, setError] = useState<string | null>(null);

  const leases = options?.leases ?? [];
  useEffect(() => {
    if (!leaseId && leases.length > 0) setLeaseId(leases[0].id);
  }, [leases, leaseId]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = createMaintenanceRequestSchema.safeParse({
        leaseId,
        title,
        description,
        priority,
      });
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Please check the form.');
      }
      return api.createMaintenanceRequest(parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      router.back();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'),
  });

  return (
    <Screen contentStyle={{ paddingTop: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h1">Report an issue</AppText>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <Card>
        {leases.length > 1 ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color={colors.textMuted}>
              Unit
            </AppText>
            {leases.map((lease) => (
              <Pressable
                key={lease.id}
                onPress={() => setLeaseId(lease.id)}
                style={{
                  borderWidth: 1,
                  borderColor: leaseId === lease.id ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  backgroundColor: leaseId === lease.id ? colors.surfaceMuted : colors.surface,
                }}
              >
                <AppText variant="title">{lease.label}</AppText>
                <AppText variant="caption" color={colors.textSubtle}>
                  {lease.propertyName}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Field
          label="What's the issue?"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Leaking kitchen faucet"
        />
        <Field
          label="Describe it"
          value={description}
          onChangeText={setDescription}
          placeholder="Where is it, how bad, since when…"
          multiline
          numberOfLines={5}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color={colors.textMuted}>
            Priority
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MAINTENANCE_PRIORITIES.map((option) => {
              const active = option === priority;
              return (
                <Pressable
                  key={option}
                  onPress={() => setPriority(option)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <AppText variant="label" color={active ? '#FFFFFF' : colors.textMuted}>
                    {MAINTENANCE_PRIORITY_LABELS[option]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}

        <Button
          label="Submit request"
          loading={mutation.isPending}
          onPress={() => {
            setError(null);
            mutation.mutate();
          }}
        />
      </Card>
    </Screen>
  );
}
