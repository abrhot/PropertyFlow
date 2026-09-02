import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';

/** Header for pushed/modal screens: back affordance, title, optional action. */
export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  backIcon = 'chevron-back',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={10}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={backIcon} size={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="h2" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
