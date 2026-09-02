import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import type { PublicListing } from '@propertyflow/types';
import { AppText, Badge, Card } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { formatCents } from '@/lib/format';

export function ListingCard({
  listing,
  onPress,
}: {
  listing: PublicListing;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  const specs = [
    `${listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} Bed`}`,
    `${listing.bathrooms} Bath`,
    listing.squareFeet ? `${listing.squareFeet} sqft` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card onPress={onPress} style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <ListingImage uri={listing.imageUrl} />
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
            {listing.propertyName}
          </AppText>
          <Badge label="Available now" tone="success" />
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          {specs}
        </AppText>
        <View
          style={{
            height: 1,
            backgroundColor: colors.border,
            marginVertical: spacing.xs,
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
            <Ionicons name="location-outline" size={14} color={colors.textSubtle} />
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {listing.city}, {listing.state}
            </AppText>
          </View>
          <AppText variant="title">
            {formatCents(listing.marketRentCents)}
            <AppText variant="caption" color={colors.textSubtle}>
              {' '}
              /mo
            </AppText>
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function ListingImage({ uri }: { uri: string | null }) {
  const { colors, radius } = useTheme();
  if (uri) {
    return <Image source={{ uri }} style={{ width: '100%', height: 220 }} resizeMode="cover" />;
  }
  return (
    <View
      style={{
        width: '100%',
        height: 220,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
      }}
    >
      <Ionicons name="home" size={40} color="rgba(255,255,255,0.45)" />
    </View>
  );
}
