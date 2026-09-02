import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';

/** Screen header with optional subtitle and notification bell. */
export function AppHeader({
  title,
  subtitle,
  greeting,
}: {
  title: string;
  subtitle?: string;
  /** When set, renders “Welcome back,” above the title (home dashboard). */
  greeting?: string;
}) {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 45_000,
    staleTime: 30_000,
  });
  const unread = data?.unreadCount ?? 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, gap: 2 }}>
        {greeting ? (
          <AppText variant="caption" color={colors.textSubtle}>
            {greeting}
          </AppText>
        ) : null}
        <AppText variant="h1">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Pressable
        onPress={() => router.push('/notifications')}
        hitSlop={10}
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="notifications-outline" size={18} color={colors.text} />
        {unread > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: colors.surface,
            }}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
