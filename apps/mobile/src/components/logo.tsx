import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '@/features/theme/theme-context';

/** Evergreen house mark — used on splash, intro, and login. */
export function LogoMark({
  size = 40,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const { colors } = useTheme();
  const bg = inverted ? 'rgba(255,255,255,0.16)' : colors.primary;
  const fg = inverted ? '#FBF8F0' : colors.primaryText;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="home" size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}
