import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import { AppText, Button, Card, Field, Screen, SearchBar } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { useTheme } from '@/features/theme/theme-context';

export default function NewConversation() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ to?: string }>();
  const isStaff = user?.role === 'ORG_ADMIN' || user?.role === 'PROPERTY_MANAGER';

  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [participantId, setParticipantId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ['messaging-options'],
    queryFn: () => api.listMessagingOptions(),
    enabled: isStaff,
  });

  const contacts = options?.contacts ?? [];
  const selected = contacts.find((contact) => contact.id === participantId);

  useEffect(() => {
    const preset = typeof params.to === 'string' ? params.to : undefined;
    if (preset && contacts.some((contact) => contact.id === preset)) {
      setParticipantId(preset);
    }
  }, [params.to, contacts]);
  const term = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return contacts.slice(0, 8);
    return contacts.filter((contact) =>
      `${contact.fullName} ${contact.email}`.toLowerCase().includes(term),
    );
  }, [contacts, term]);

  const mutation = useMutation({
    mutationFn: () => api.createConversation({ subject: subject.trim(), body: body.trim(), participantId }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.replace(`/conversation/${conversation.id}`);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Unable to start the conversation.'),
  });

  function submit() {
    setError(null);
    if (subject.trim().length < 2 || body.trim().length < 1) {
      setError('Add a subject and a message.');
      return;
    }
    if (isStaff && contacts.length > 0 && !participantId) {
      setError('Find an account by name or email first.');
      return;
    }
    mutation.mutate();
  }

  return (
    <Screen contentStyle={{ paddingTop: spacing.xl, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h1">New message</AppText>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <Card>
        {!isStaff ? (
          <AppText variant="caption" color={colors.textMuted}>
            This message goes to your management team.
          </AppText>
        ) : null}

        {isStaff && contacts.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color={colors.textMuted}>
              To
            </AppText>
            {selected ? (
              <Pressable
                onPress={() => {
                  setParticipantId(undefined);
                  setQuery('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="title">{selected.fullName}</AppText>
                  <AppText variant="caption" color={colors.textSubtle}>
                    {selected.email}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.textMuted}>
                  Change
                </AppText>
              </Pressable>
            ) : (
              <>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find by name or email"
                  keyboardType="email-address"
                />
                {term && matches.length === 0 ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    No account matches “{query.trim()}”.
                  </AppText>
                ) : (
                  matches.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => {
                        setParticipantId(contact.id);
                        setQuery('');
                      }}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <AppText variant="title">{contact.fullName}</AppText>
                      <AppText variant="caption" color={colors.textSubtle}>
                        {contact.email}
                      </AppText>
                    </Pressable>
                  ))
                )}
              </>
            )}
          </View>
        ) : null}

        <Field value={subject} onChangeText={setSubject} placeholder="Subject" />
        <Field
          value={body}
          onChangeText={setBody}
          placeholder="Write your message…"
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}

        <Button label="Send" compact inline loading={mutation.isPending} onPress={submit} />
      </Card>
    </Screen>
  );
}
