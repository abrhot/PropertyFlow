import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyType } from '@propertyflow/constants';
import { PageHeader } from '@/components/page-header';
import { QueryState } from '@/components/data-state';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChipSelect,
  Row,
  Screen,
  SearchBar,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';

const TYPE_OPTIONS = [
  { label: 'All types', value: 'ALL' },
  ...PROPERTY_TYPES.map((type) => ({ label: PROPERTY_TYPE_LABELS[type], value: type })),
];

export default function PropertiesScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { ability } = useAuth();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const debouncedSearch = useDebounced(search);

  const params = {
    search: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : (type as PropertyType),
  };

  const query = useQuery({
    queryKey: ['properties', params],
    queryFn: () => api.listProperties(params),
  });

  const properties = query.data?.properties ?? [];
  const summary = query.data?.summary;
  const canCreate = ability.can('create', 'Property');

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader
        title="Properties"
        subtitle={summary ? `${summary.propertyCount} buildings · ${summary.unitCount} units` : undefined}
        action={
          canCreate ? (
            <Button label="Add" compact onPress={() => router.push('/properties/edit')} />
          ) : undefined
        }
      />

      {summary ? (
        <StatGrid>
          <StatCard label="Occupancy" value={`${summary.occupancyRate}%`} tone="accent" hint={`${summary.occupiedUnits} of ${summary.unitCount} occupied`} />
          <StatCard label="Monthly rent roll" value={formatCents(summary.monthlyRentCents)} hint="Combined market rent" />
        </StatGrid>
      ) : null}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or city" />
      <ChipSelect options={TYPE_OPTIONS} value={type} onChange={setType} />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={properties.length === 0}
        emptyIcon="business-outline"
        emptyTitle="No properties match"
        emptySubtitle={
          canCreate ? 'Add your first building to start tracking units and rent.' : 'Try a different search.'
        }
        emptyAction={
          canCreate ? (
            <Button label="Add property" compact onPress={() => router.push('/properties/edit')} />
          ) : undefined
        }
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: spacing.md }}>
          {properties.map((property) => (
            <Card key={property.id} onPress={() => router.push(`/properties/${property.id}`)}>
              {property.imageUrl ? (
                <Image
                  source={{ uri: property.imageUrl }}
                  style={{ width: '100%', height: 140, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}
                />
              ) : null}
              <View style={{ gap: spacing.xs }}>
                <Row>
                  <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
                    {property.name}
                  </AppText>
                  <Badge label={PROPERTY_TYPE_LABELS[property.type]} tone="info" />
                </Row>
                <AppText variant="caption" color={colors.textMuted}>
                  {property.addressLine1}, {property.city} {property.state}
                </AppText>
              </View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Metric label="Units" value={String(property.stats.unitCount)} />
                <Metric label="Occupied" value={`${property.stats.occupancyRate}%`} />
                <Metric label="Rent" value={formatCents(property.stats.monthlyRentCents)} />
              </Row>
            </Card>
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 1 }}>
      <AppText variant="caption" color={colors.textSubtle}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}
