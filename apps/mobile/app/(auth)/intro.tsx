import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { ListingCard } from '@/components/listing-card';
import { AppText, Button, EmptyState, Screen } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { fontFamily } from '@/theme';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

export default function IntroScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['public-listings'],
    queryFn: () => api.listPublicListings(),
    retry: 1,
  });

  const term = search.trim().toLowerCase();
  const listings = (data?.listings ?? []).filter((l) =>
    term ? `${l.propertyName} ${l.city} ${l.state} ${l.label}`.toLowerCase().includes(term) : true,
  );

  return (
    <Screen contentStyle={{ paddingTop: spacing.lg, gap: spacing.lg }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        <AppText variant="label" color={colors.textMuted}>
          Back
        </AppText>
      </Pressable>

      <View style={{ gap: 4 }}>
        <AppText variant="h1">Homes</AppText>
        <AppText variant="body" color={colors.textMuted}>
          {data?.listings?.length ?? 0} available near you
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.input,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          minHeight: 50,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textSubtle} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by area or unit"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          style={{ flex: 1, fontFamily, fontSize: 17, color: colors.text, paddingVertical: spacing.sm }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
      ) : isError ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <EmptyState
            title="Couldn’t load homes"
            subtitle={formatApiError(error, 'Something went wrong loading listings.')}
          />
          <Button
            label={isFetching ? 'Retrying…' : 'Try again'}
            loading={isFetching}
            onPress={() => void refetch()}
          />
        </View>
      ) : listings.length === 0 ? (
        <EmptyState
          title="No homes match"
          subtitle="Try a different search, or check back soon."
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {listings.map((listing) => (
            <ListingCard
              key={listing.unitId}
              listing={listing}
              onPress={() => router.push(`/(auth)/listing/${listing.unitId}` as Href)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
