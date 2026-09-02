import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import type { ListingInterest } from '@propertyflow/types';
import { publicInquirySchema } from '@propertyflow/validation';
import { AppText, Button, EmptyState, Field, Screen } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatCents } from '@/lib/format';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['public-listings'],
    queryFn: () => api.listPublicListings(),
  });
  const listing = data?.listings.find((l) => l.unitId === id);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const interest: ListingInterest = 'RENT';

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = contact.trim();
      const emailLike = trimmed.includes('@');
      if (!emailLike) {
        throw new ApiError(400, 'Include an email so we can reply (phone alone is not enough).');
      }
      const parsed = publicInquirySchema.safeParse({
        unitId: id,
        interest,
        applicantName: name,
        applicantEmail: trimmed,
        notes: notes || undefined,
      });
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Please check the form.');
      }
      const { desiredMoveIn, ...rest } = parsed.data;
      return api.submitPublicInquiry({
        ...rest,
        ...(desiredMoveIn ? { desiredMoveIn: desiredMoveIn.toISOString() } : {}),
      });
    },
    onSuccess: () => setDone(true),
    onError: (err) => setError(formatApiError(err, 'Could not send your request.')),
  });

  const specs = listing
    ? [
        `${listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} Bed`}`,
        `${listing.bathrooms} Bath`,
        listing.squareFeet ? `${listing.squareFeet} sqft` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Screen contentStyle={{ gap: spacing.lg }}>
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

      {isLoading ? (
        <EmptyState title="Loading…" />
      ) : !listing ? (
        <EmptyState title="Home not found" subtitle="It may have just been taken." />
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <AppText variant="h1">{listing.propertyName}</AppText>
            <AppText variant="body" color={colors.textMuted}>
              {specs}
            </AppText>
          </View>

          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={{ width: '100%', height: 220, borderRadius: radius.xl }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 220,
                borderRadius: radius.xl,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="home" size={48} color="rgba(255,255,255,0.4)" />
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Ionicons name="location-outline" size={16} color={colors.textSubtle} />
              <AppText variant="body" color={colors.textMuted}>
                {listing.city}, {listing.state}
              </AppText>
            </View>
            <AppText variant="h2">
              {formatCents(listing.marketRentCents)}
              <AppText variant="caption" color={colors.textSubtle}>
                {' '}
                /mo
              </AppText>
            </AppText>
          </View>

          {listing.description ? (
            <AppText variant="body" color={colors.textMuted} style={{ lineHeight: 22 }}>
              {listing.description}
            </AppText>
          ) : null}

          {listing.facilities?.length ? (
            <View style={{ gap: spacing.md }}>
              <AppText variant="h2">Features</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {listing.facilities.map((facility) => (
                  <View
                    key={facility}
                    style={{
                      backgroundColor: colors.chip,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <AppText variant="caption" color={colors.text}>
                      {facility}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.md }}>
            <AppText variant="h2">Send an inquiry</AppText>
            {done ? (
              <AppText variant="body" color={colors.success}>
                Thanks — your inquiry was sent. We’ll be in touch soon.
              </AppText>
            ) : (
              <>
                <Field value={name} onChangeText={setName} placeholder="Your name" />
                <Field
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Phone or email"
                  autoCapitalize="none"
                />
                <Field
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={`I'd like to view ${listing.propertyName}…`}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                />
                {error ? (
                  <AppText variant="caption" color={colors.danger}>
                    {error}
                  </AppText>
                ) : null}
                <Button
                  label="Send inquiry"
                  variant="accent"
                  loading={mutation.isPending}
                  onPress={() => mutation.mutate()}
                />
              </>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
