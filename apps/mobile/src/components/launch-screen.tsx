import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LogoMark } from '@/components/logo';
import { useTheme } from '@/features/theme/theme-context';
import { fontFamily } from '@/theme';

/** Short branded intro shown before the first real screen. */
export function LaunchScreen() {
  const { colors } = useTheme();
  const mark = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mark, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(word, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mark, ring, word]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: 196,
          height: 196,
          borderRadius: 98,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.55] }) }],
        }}
      />
      <Animated.View
        style={{
          opacity: mark,
          transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        }}
      >
        <LogoMark size={84} />
      </Animated.View>
      <Animated.Text
        style={{
          marginTop: 18,
          color: colors.text,
          fontFamily: fontFamily,
          fontSize: 28,
          fontWeight: '600',
          letterSpacing: 0,
          opacity: word,
          transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        PropertyFlow
      </Animated.Text>
    </View>
  );
}
