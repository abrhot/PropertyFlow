import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';

/** Opens the AI assistant from any screen. Hidden while already in that chat. */
export function AssistantFab() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (pathname.includes('assistant')) return null;

  return (
    <Pressable
      onPress={() => router.push('/assistant')}
      accessibilityLabel="Ask PropertyFlow"
      style={{
        position: 'absolute',
        right: 16,
        bottom: Math.max(insets.bottom, 12) + 64,
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 28,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 40,
      }}
    >
      <Ionicons name="sparkles" size={18} color={colors.primaryText} />
      <AppText variant="label" color={colors.primaryText}>
        Ask
      </AppText>
    </Pressable>
  );
}
