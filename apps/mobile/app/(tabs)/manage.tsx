import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@propertyflow/constants';
import { AppHeader } from '@/components/header';
import { AppText, Card, Divider, ListRow, Screen, StatCard, StatGrid } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { hubEntriesFor } from '@/features/nav/sections';
import { api } from '@/lib/api';

/**
 * Everything the user can manage that does not fit in the bottom tab bar.
 * Mirrors the web sidebar, filtered by the same ability rules.
 */
export default function ManageScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { user, sections, ability } = useAuth();

  const entries = hubEntriesFor(sections, ability.can('read', 'Lease'));

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
  });
  const metrics = summaryQuery.data?.metrics ?? [];

  return (
    <Screen onRefresh={() => summaryQuery.refetch()} refreshing={summaryQuery.isFetching}>
      <AppHeader
        title="Manage"
        subtitle={user ? ROLE_DESCRIPTIONS[user.role] : undefined}
      />

      {metrics.length > 0 ? (
        <StatGrid>
          {metrics.slice(0, 4).map((metric) => (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              hint={metric.delta}
              tone={metric.trend === 'up' ? 'success' : metric.trend === 'down' ? 'danger' : 'neutral'}
            />
          ))}
        </StatGrid>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <AppText variant="h2">Workspace</AppText>
        <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
          <ListRow
            title="Ask PropertyFlow"
            subtitle="AI help for homes, leases, rent, and repairs"
            icon="sparkles-outline"
            onPress={() => router.push('/assistant')}
          />
          <Divider />
          {entries.map((entry, index) => (
            <View key={entry.section}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={entry.label}
                subtitle={entry.description}
                icon={entry.icon}
                onPress={() => router.push(entry.href)}
              />
            </View>
          ))}
        </Card>
      </View>

      {user ? (
        <AppText variant="caption" color={colors.textSubtle} style={{ textAlign: 'center' }}>
          Signed in as {ROLE_LABELS[user.role]}
        </AppText>
      ) : null}
    </Screen>
  );
}
