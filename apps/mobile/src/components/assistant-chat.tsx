import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type AssistantCard, type AssistantChatMessage } from '@propertyflow/api-client';
import { MAINTENANCE_PRIORITY_LABELS, ROLE_LABELS } from '@propertyflow/constants';
import { AppText, Button } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { fontFamily } from '@/theme';

const FALLBACK_HOME =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

const STARTERS = [
  { label: 'Available homes', message: 'How many available homes do we have?' },
  { label: 'Dashboard', message: 'How is the dashboard looking?' },
  { label: 'My lease', message: 'Explain my lease' },
];

/** Shown after "Report a repair" so the resident picks the real problem instead of a canned one. */
const REPAIR_ISSUES = [
  'A faucet or pipe is leaking',
  'No hot water',
  'Heating or cooling is not working',
  'A drain or toilet is clogged',
  'An outlet or light stopped working',
  'An appliance is broken',
];

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

function welcomeFor(signedIn: boolean, name?: string, role?: string): AssistantChatMessage {
  const who = signedIn
    ? `You are signed in${name ? ` as ${name}` : ''}${role ? ` (${role})` : ''}. I can see your dashboard, lease, and rent for this session.`
    : 'You are not signed in — I am talking to you as a guest. Sign in and I can see your live account activity.';
  return {
    role: 'assistant',
    content: `Hey — I can show vacant homes with photos, read your dashboard, explain a lease, or turn a repair into a work order. ${who}`,
  };
}

export function AssistantChat() {
  const { colors, spacing, radius } = useTheme();
  const { user, status } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const signedIn = status === 'authenticated' && Boolean(user);
  const roleLabel = user ? ROLE_LABELS[user.role] : undefined;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickingRepair, setPickingRepair] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [welcomeFor(false)]);
  const scroller = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const thread = Array.isArray(messages)
    ? messages
    : [welcomeFor(signedIn, user?.fullName, roleLabel)];

  useEffect(() => {
    setMessages((current) => {
      const list = Array.isArray(current) ? current : [];
      const nextWelcome = welcomeFor(signedIn, user?.fullName, roleLabel);
      if (list.length <= 1) return [nextWelcome];
      return list;
    });
  }, [signedIn, user?.fullName, roleLabel]);

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, [thread, busy, keyboardHeight]);

  async function send(preset?: string) {
    const message = (preset ?? draft).trim();
    if (!message || busy) return;
    setPickingRepair(false);
    const next = [...thread, { role: 'user' as const, content: message }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const response = await api.chatWithAssistant({
        message,
        history: next.slice(-10),
      });
      setMessages((current) => [
        ...(Array.isArray(current) ? current : next),
        { role: 'assistant', content: response.answer, cards: response.cards },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...(Array.isArray(current) ? current : next),
        {
          role: 'assistant',
          content: `I could not reach the assistant. ${formatApiError(error, 'Try again shortly.')}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {thread.map((item, index) => (
          <View key={`${item.role}-${index}`} style={{ gap: spacing.sm }}>
            <View
              style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                borderRadius: radius.lg,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: item.role === 'user' ? colors.bubbleMine : colors.surface,
                borderWidth: item.role === 'user' ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <AppText
                variant="body"
                color={item.role === 'user' ? colors.primaryText : colors.text}
              >
                {item.content}
              </AppText>
            </View>
            {item.cards?.map((card, cardIndex) => (
              <AssistantCardView key={`${card.kind}-${cardIndex}`} card={card} />
            ))}
          </View>
        ))}
        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" color={colors.textMuted}>
              Thinking…
            </AppText>
          </View>
        ) : null}
        {thread.length === 1 && !busy ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STARTERS.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => void send(item.message)}
                  style={{
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: colors.surface,
                  }}
                >
                  <AppText variant="caption">{item.label}</AppText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setPickingRepair((value) => !value)}
                style={{
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: pickingRepair ? colors.primary : colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: colors.surface,
                }}
              >
                <AppText variant="caption">Report a repair</AppText>
              </Pressable>
            </View>
            {pickingRepair ? (
              <View
                style={{
                  gap: 8,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  padding: spacing.md,
                }}
              >
                <AppText variant="caption" color={colors.textMuted}>
                  Pick what is going on and I will draft the work order.
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REPAIR_ISSUES.map((issue) => (
                    <Pressable
                      key={issue}
                      onPress={() => void send(`Repair needed: ${issue}`)}
                      style={{
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: colors.input,
                      }}
                    >
                      <AppText variant="caption">{issue}</AppText>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => {
                      setPickingRepair(false);
                      inputRef.current?.focus();
                    }}
                    style={{
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: colors.input,
                    }}
                  >
                    <AppText variant="caption">Something else…</AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about homes, rent, leases…"
          placeholderTextColor={colors.textSubtle}
          multiline
          onFocus={() => {
            setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
          }}
          style={{
            flex: 1,
            fontFamily,
            fontSize: 17,
            color: colors.text,
            minHeight: 48,
            maxHeight: 120,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.input,
          }}
        />
        <Pressable
          onPress={() => void send()}
          disabled={busy || !draft.trim()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: busy || !draft.trim() ? colors.surfaceMuted : colors.primary,
          }}
        >
          <Ionicons
            name="send"
            size={18}
            color={busy || !draft.trim() ? colors.textSubtle : colors.primaryText}
          />
        </Pressable>
      </View>
    </View>
  );
}

function AssistantCardView({ card }: { card: AssistantCard }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  if (card.kind === 'home') {
    return (
      <Pressable
        onPress={() => router.push(`/(auth)/listing/${card.unitId}`)}
        style={{
          alignSelf: 'flex-start',
          width: '88%',
          overflow: 'hidden',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Image
          source={{ uri: card.imageUrl || FALLBACK_HOME }}
          style={{ width: '100%', height: 140 }}
        />
        <View style={{ padding: spacing.md, gap: 6 }}>
          <AppText variant="title">{card.title}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {card.subtitle}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(card.facts ?? []).map((fact) => (
              <View key={fact.label}>
                <AppText variant="caption" color={colors.textSubtle}>
                  {fact.label}
                </AppText>
                <AppText variant="label">{fact.value}</AppText>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
    );
  }

  if (card.kind === 'metric') {
    return (
      <Pressable
        onPress={() => router.push('/(tabs)')}
        style={{
          alignSelf: 'flex-start',
          width: '88%',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.md,
        }}
      >
        <AppText variant="caption" color={colors.textSubtle}>
          {card.label}
        </AppText>
        <AppText variant="h2">{card.value}</AppText>
        {card.hint ? (
          <AppText variant="caption" color={colors.textMuted}>
            {card.hint}
          </AppText>
        ) : null}
      </Pressable>
    );
  }

  if (card.kind === 'lease') {
    return (
      <Pressable
        onPress={() => router.push('/lease')}
        style={{
          alignSelf: 'flex-start',
          width: '88%',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.md,
          gap: 6,
        }}
      >
        <AppText variant="title">{card.title}</AppText>
        {(card.facts ?? []).map((fact) => (
          <View key={fact.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" color={colors.textMuted}>
              {fact.label}
            </AppText>
            <AppText variant="caption">{fact.value}</AppText>
          </View>
        ))}
      </Pressable>
    );
  }

  return <WorkOrderCard card={card} />;
}

function WorkOrderCard({ card }: { card: Extract<AssistantCard, { kind: 'workOrder' }> }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!card.leaseId || busy) return;
    setBusy(true);
    try {
      await api.createMaintenanceRequest({
        leaseId: card.leaseId,
        title: card.title,
        description: card.description,
        priority: card.priority,
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        width: '88%',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <AppText variant="title">{card.title}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {MAINTENANCE_PRIORITY_LABELS[card.priority]} priority
      </AppText>
      <AppText variant="body">{card.description}</AppText>
      {done ? (
        <AppText variant="caption" color={colors.success}>
          Request submitted
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {card.leaseId ? (
            <Button
              label="Submit request"
              compact
              inline
              loading={busy}
              onPress={() => void submit()}
            />
          ) : null}
          <Button
            label="Open form"
            variant="secondary"
            compact
            inline
            onPress={() => router.push('/maintenance/new')}
          />
        </View>
      )}
    </View>
  );
}
