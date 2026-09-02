import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { QueryState } from '@/components/data-state';
import { AppHeader } from '@/components/header';
import { AppText, Avatar, Button, Card, Row, Screen, SearchBar } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const isStaff = user?.role === 'ORG_ADMIN' || user?.role === 'PROPERTY_MANAGER';
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.listConversations(),
    refetchInterval: 30_000,
  });

  const optionsQuery = useQuery({
    queryKey: ['messaging-options'],
    queryFn: () => api.listMessagingOptions(),
    enabled: isStaff,
  });

  const term = search.trim().toLowerCase();
  const conversations = (query.data?.conversations ?? []).filter((conversation) =>
    term
      ? `${conversation.subject} ${conversation.lastMessage.body} ${conversation.lastMessage.senderName}`
          .toLowerCase()
          .includes(term)
      : true,
  );

  const accountMatches = useMemo(() => {
    if (!term) return [];
    return (optionsQuery.data?.contacts ?? []).filter((contact) =>
      `${contact.fullName} ${contact.email}`.toLowerCase().includes(term),
    );
  }, [optionsQuery.data?.contacts, term]);

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => query.refetch()} refreshing={query.isFetching && !query.isLoading}>
        <AppHeader
          title="Messages"
          subtitle={`${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
        />

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={isStaff ? 'Search messages or find by email' : 'Search messages'}
          keyboardType="email-address"
        />

        {accountMatches.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color={colors.textMuted}>
              Accounts
            </AppText>
            {accountMatches.slice(0, 5).map((contact) => (
              <Card
                key={contact.id}
                onPress={() => router.push(`/conversation/new?to=${contact.id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <Avatar name={contact.fullName} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title">{contact.fullName}</AppText>
                  <AppText variant="caption" color={colors.textSubtle}>
                    {contact.email}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.accent}>
                  New chat
                </AppText>
              </Card>
            ))}
          </View>
        ) : term.includes('@') && isStaff ? (
          <AppText variant="caption" color={colors.textMuted}>
            No account matches that email.
          </AppText>
        ) : null}

        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty={conversations.length === 0}
          emptyIcon="chatbubbles-outline"
          emptyTitle={term ? 'No matching messages' : 'No conversations yet'}
          emptySubtitle={
            term
              ? 'Try a name, subject, or email.'
              : 'Start a conversation and it will appear here.'
          }
          emptyAction={
            term ? undefined : (
              <Button label="New chat" compact inline onPress={() => router.push('/conversation/new')} />
            )
          }
          onRetry={() => query.refetch()}
        >
          <View style={{ gap: spacing.md }}>
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                onPress={() => router.push(`/conversation/${conversation.id}`)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}
              >
                <Avatar name={conversation.lastMessage.senderName || conversation.subject} size={46} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Row>
                    <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
                      {conversation.subject}
                    </AppText>
                    <AppText variant="caption" color={colors.textSubtle}>
                      {formatRelative(conversation.lastMessageAt)}
                    </AppText>
                  </Row>
                  <AppText variant="caption" color={colors.textSubtle}>
                    {conversation.lastMessage.senderName} · {conversation.messageCount} message
                    {conversation.messageCount === 1 ? '' : 's'}
                  </AppText>
                  <AppText variant="body" color={colors.textMuted} numberOfLines={2}>
                    {conversation.lastMessage.body}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </QueryState>
      </Screen>

      <Pressable
        onPress={() => router.push('/conversation/new')}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: spacing.lg,
            bottom: spacing.lg,
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { opacity: 0.9 } : undefined,
        ]}
      >
        <Ionicons name="create-outline" size={18} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}
