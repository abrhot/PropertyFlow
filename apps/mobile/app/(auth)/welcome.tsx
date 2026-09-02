import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '@/components/ui';
import { LogoMark } from '@/components/logo';
import { useTheme } from '@/features/theme/theme-context';
import { markWelcomeSeen } from '@/lib/onboarding';

const SLIDES = [
  {
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
    kicker: 'Homes',
    title: 'Find a place that feels like yours.',
    body: 'Browse real listings with photos, rent, and details — even before you sign in.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
    kicker: 'Rent',
    title: 'Pay on time, without the chase.',
    body: 'See what’s due, pay in a tap, and keep every receipt in one quiet place.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1484154212942-b2c2b1c0e0b3?auto=format&fit=crop&w=1400&q=80',
    kicker: 'Care',
    title: 'Report a leak. Watch it get fixed.',
    body: 'Send photos, follow the work order, and know when someone is on the way.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80',
    kicker: 'Together',
    title: 'Everyone sees only what they need.',
    body: 'Residents, managers, owners, and technicians — one calm workspace.',
  },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [index, fade]);

  async function finish(href: '/(auth)/login' | '/(auth)/intro') {
    await markWelcomeSeen();
    router.replace(href);
  }

  function next() {
    if (last) {
      void finish('/(auth)/login');
      return;
    }
    setIndex((value) => value + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1D2A25' }}>
      <Animated.View style={{ ...StyleSheetFill, opacity: fade }}>
        <Image source={{ uri: slide.image }} style={StyleSheetFill} resizeMode="cover" />
      </Animated.View>
      <View
        style={{
          ...StyleSheetFill,
          backgroundColor: 'rgba(18, 28, 24, 0.42)',
        }}
      />
      <View
        style={{
          ...StyleSheetFill,
          backgroundColor: 'transparent',
          justifyContent: 'space-between',
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: spacing.lg,
        }}
      >
        <LogoMark size={40} inverted />

        <Animated.View style={{ gap: 10, opacity: fade, paddingBottom: 48 }}>
          <AppText
            variant="caption"
            color="rgba(251,248,240,0.7)"
            style={{ textTransform: 'uppercase', fontWeight: '600' }}
          >
            {slide.kicker}
          </AppText>
          <AppText variant="h1" color="#FBF8F0" style={{ fontSize: 34, lineHeight: 40 }}>
            {slide.title}
          </AppText>
          <AppText variant="body" color="rgba(251,248,240,0.78)" style={{ lineHeight: 22 }}>
            {slide.body}
          </AppText>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.md }}>
            {SLIDES.map((_, i) => (
              <View
                key={SLIDES[i].kicker}
                style={{
                  height: 3,
                  width: i === index ? 22 : 8,
                  borderRadius: 99,
                  backgroundColor: i === index ? '#FBF8F0' : 'rgba(251,248,240,0.35)',
                }}
              />
            ))}
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button label={last ? 'Get started' : 'Continue'} compact inline onPress={next} />
          </View>
        </Animated.View>
      </View>

      <Pressable
        onPress={() => void finish('/(auth)/login')}
        hitSlop={12}
        style={{
          position: 'absolute',
          left: spacing.lg,
          bottom: insets.bottom + 22,
        }}
      >
        <AppText variant="caption" color="rgba(251,248,240,0.7)">
          Skip
        </AppText>
      </Pressable>
    </View>
  );
}

const StyleSheetFill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
