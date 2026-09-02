import { Ionicons } from '@expo/vector-icons';
import { ROLE_LABELS } from '@propertyflow/constants';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AssistantChat } from '@/components/assistant-chat';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';

export default function AssistantScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const signedIn = status === 'authenticated' && Boolean(user);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Assistant</AppText>
          <AppText variant="caption" color={signedIn ? colors.success : colors.textMuted}>
            {signedIn
              ? `Signed in · ${user?.fullName ?? 'Account'} · ${user ? ROLE_LABELS[user.role] : ''}`
              : 'Not signed in · guest'}
          </AppText>
        </View>
      </View>
      <AssistantChat />
    </SafeAreaView>
  );
}
