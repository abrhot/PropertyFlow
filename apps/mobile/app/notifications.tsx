import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNotification } from '@propertyflow/types';
import { AppText, Button, Card, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { resolveNotificationRoute } from '@/lib/notification-route';
import { useTheme } from '@/features/theme/theme-context';

export default function NotificationsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.listNotifications(),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  function open(notification: AppNotification) {
    if (!notification.isRead) markRead.mutate(notification.id);
    router.push(resolveNotificationRoute(notification) as never);
  }

  const notifications = data?.notifications ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
          <AppText variant="h1">Notifications</AppText>
        </View>
        {notifications.some((n) => !n.isRead) ? (
          <Button label="Mark all" variant="ghost" compact inline onPress={() => markAll.mutate()} />
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : notifications.length === 0 ? (
        <EmptyState title="You're all caught up" subtitle="New alerts will show up here." />
      ) : (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              onPress={() => open(notification)}
              style={{
                gap: spacing.xs,
                borderColor: notification.isRead ? colors.border : colors.accent,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {!notification.isRead ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: radius.pill,
                      backgroundColor: colors.accent,
                    }}
                  />
                ) : null}
                <AppText variant="title" style={{ flex: 1 }}>
                  {notification.title}
                </AppText>
                <AppText variant="caption" color={colors.textSubtle}>
                  {formatRelative(notification.createdAt)}
                </AppText>
              </View>
              <AppText variant="body" color={colors.textMuted}>
                {notification.body}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
