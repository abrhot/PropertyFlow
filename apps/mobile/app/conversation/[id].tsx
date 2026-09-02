import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const [draft, setDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.getConversation(id),
    refetchInterval: 15_000,
    enabled: Boolean(id),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.sendMessage(id, { body }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const other =
    data?.messages.map((m) => m.sender).find((s) => s.id !== user?.id) ??
    data?.messages[0]?.sender;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {other ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="label" color={colors.accent}>
              {initials(other.fullName)}
            </AppText>
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {other?.fullName ?? data?.subject ?? 'Conversation'}
          </AppText>
          <AppText variant="caption" color={colors.textSubtle}>
            {data?.subject ?? 'Property team'}
          </AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {data?.messages.map((message) => {
              const mine = message.sender.id === user?.id;
              return (
                <View
                  key={message.id}
                  style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}
                >
                  <View
                    style={{
                      backgroundColor: mine ? colors.bubbleMine : colors.bubbleOther,
                      borderWidth: mine ? 0 : 1,
                      borderColor: colors.border,
                      borderRadius: radius.xl,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      gap: 4,
                    }}
                  >
                    <AppText variant="body" color={mine ? '#FFFFFF' : colors.text}>
                      {message.body}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={mine ? 'rgba(255,255,255,0.65)' : colors.textSubtle}
                    >
                      {formatRelative(message.createdAt)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              backgroundColor: colors.surfaceMuted,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: 15,
            }}
          />
          <Pressable
            disabled={!draft.trim() || sendMutation.isPending}
            onPress={() => sendMutation.mutate(draft.trim())}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: draft.trim() ? colors.accent : colors.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
