import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, View } from 'react-native';
import { resource } from '@propertyflow/auth';
import { PROPERTY_TYPE_LABELS, UNIT_STATUS_LABELS, type UnitStatus } from '@propertyflow/constants';
import type { Unit } from '@propertyflow/types';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  KeyValue,
  Row,
  Screen,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatCents } from '@/lib/format';

const UNIT_TONE: Record<UnitStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  OCCUPIED: 'success',
  VACANT: 'neutral',
  MAINTENANCE: 'warning',
  UNAVAILABLE: 'danger',
};

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, radius } = useTheme();
  const { ability } = useAuth();

  const query = useQuery({
    queryKey: ['properties', 'detail', id],
    queryFn: () => api.getProperty(id),
    enabled: Boolean(id),
  });

  const property = query.data;
  const canEdit = property
    ? ability.can(
        'update',
        resource('Property', {
          id: property.id,
          organizationId: property.organizationId,
          ownerId: property.ownerId ?? undefined,
        }),
      )
    : false;

  const deleteUnit = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(id, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err) => Alert.alert('Could not remove unit', formatApiError(err, 'Please try again.')),
  });

  const deleteProperty = useMutation({
    mutationFn: () => api.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: (err) => Alert.alert('Could not delete', formatApiError(err, 'Please try again.')),
  });

  function confirmDeleteUnit(unit: Unit) {
    Alert.alert('Remove unit', `Delete ${unit.label}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUnit.mutate(unit.id) },
    ]);
  }

  function confirmDeleteProperty() {
    Alert.alert('Delete property', `Delete ${property?.name}? This removes its units too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProperty.mutate() },
    ]);
  }

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader title={property?.name ?? 'Property'} subtitle={property?.city} />

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {property ? (
          <View style={{ gap: spacing.lg }}>
            {property.imageUrl ? (
              <Image
                source={{ uri: property.imageUrl }}
                style={{ width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }}
              />
            ) : null}

            <Row style={{ flexWrap: 'wrap' }}>
              <Badge label={PROPERTY_TYPE_LABELS[property.type]} tone="info" />
              {property.owner ? <Badge label={`Owner · ${property.owner.fullName}`} /> : null}
            </Row>

            <StatGrid>
              <StatCard label="Units" value={String(property.stats.unitCount)} />
              <StatCard label="Occupancy" value={`${property.stats.occupancyRate}%`} tone="accent" />
              <StatCard label="Occupied" value={String(property.stats.occupiedUnits)} />
              <StatCard label="Rent roll" value={formatCents(property.stats.monthlyRentCents)} />
            </StatGrid>

            <Card>
              <AppText variant="h2">Address</AppText>
              <KeyValue label="Street" value={property.addressLine1} />
              {property.addressLine2 ? <KeyValue label="Unit / suite" value={property.addressLine2} /> : null}
              <KeyValue label="City" value={`${property.city}, ${property.state} ${property.postalCode}`} />
              <KeyValue label="Country" value={property.country} />
              {property.yearBuilt ? <KeyValue label="Year built" value={String(property.yearBuilt)} /> : null}
            </Card>

            {property.notes ? (
              <Card>
                <AppText variant="h2">Notes</AppText>
                <AppText variant="body" color={colors.textMuted}>
                  {property.notes}
                </AppText>
              </Card>
            ) : null}

            <View style={{ gap: spacing.md }}>
              <Row>
                <AppText variant="h2" style={{ flex: 1 }}>
                  Units
                </AppText>
                {canEdit ? (
                  <Button
                    label="Add unit"
                    variant="secondary"
                    compact
                    onPress={() => router.push({ pathname: '/units/edit', params: { propertyId: property.id } })}
                  />
                ) : null}
              </Row>

              {property.units.length === 0 ? (
                <Card>
                  <AppText variant="body" color={colors.textMuted}>
                    No units yet. Add one to start leasing this building.
                  </AppText>
                </Card>
              ) : (
                <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                  {property.units.map((unit, index) => (
                    <View key={unit.id}>
                      {index > 0 ? <Divider /> : null}
                      <View style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
                        <Row>
                          <View style={{ flex: 1, gap: 2 }}>
                            <AppText variant="title">{unit.label}</AppText>
                            <AppText variant="caption" color={colors.textMuted}>
                              {unit.bedrooms} bd · {unit.bathrooms} ba
                              {unit.squareFeet ? ` · ${unit.squareFeet} sqft` : ''} ·{' '}
                              {formatCents(unit.marketRentCents)}/mo
                            </AppText>
                          </View>
                          <Badge label={UNIT_STATUS_LABELS[unit.status]} tone={UNIT_TONE[unit.status]} />
                        </Row>
                        {canEdit ? (
                          <Row>
                            <Button
                              label="Edit"
                              variant="ghost"
                              compact
                              onPress={() =>
                                router.push({
                                  pathname: '/units/edit',
                                  params: { propertyId: property.id, unitId: unit.id },
                                })
                              }
                            />
                            <Button label="Remove" variant="ghost" compact onPress={() => confirmDeleteUnit(unit)} />
                          </Row>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </View>

            {canEdit ? (
              <View style={{ gap: spacing.md }}>
                <Button
                  label="Edit property"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/properties/edit', params: { id: property.id } })}
                />
                <Button
                  label="Delete property"
                  variant="danger"
                  loading={deleteProperty.isPending}
                  onPress={confirmDeleteProperty}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </QueryState>
    </Screen>
  );
}
