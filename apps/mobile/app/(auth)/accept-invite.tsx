import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import { ROLE_LABELS } from '@propertyflow/constants';
import { acceptInvitationSchema } from '@propertyflow/validation';
import { AppText, Badge, Button, Card, EmptyState, Field, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/features/theme/theme-context';

export default function AcceptInviteScreen() {
  const { colors, spacing, radius } = useTheme();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { acceptInvitation } = useAuth();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = useQuery({
    queryKey: ['invitation', 'preview', token],
    queryFn: () => api.previewInvitation({ token }),
    enabled: token.length > 0,
    retry: false,
  });

  async function submit() {
    setError(null);
    const parsed = acceptInvitationSchema.safeParse({ token, fullName, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }
    setPending(true);
    try {
      await acceptInvitation(parsed.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to accept this invitation.');
    } finally {
      setPending(false);
    }
  }

  if (!token || preview.isError) {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <EmptyState
          title="Invitation unavailable"
          subtitle="This link may be expired, already used, or incomplete."
        />
        <Button
          label="Back to sign in"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  if (preview.isLoading || !preview.data) {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <EmptyState title="Checking invitation…" />
      </Screen>
    );
  }

  const invitation = preview.data;

  return (
    <Screen contentStyle={{ paddingTop: spacing.xl }}>
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="mail-open-outline" size={30} color={colors.accent} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="h1">You’re invited</AppText>
        <AppText variant="body" color={colors.textMuted}>
          Join {invitation.organizationName} in PropertyFlow.
        </AppText>
      </View>

      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">{invitation.email}</AppText>
            <AppText variant="caption" color={colors.textSubtle}>
              Expires {formatDate(invitation.expiresAt)}
            </AppText>
          </View>
          <Badge label={ROLE_LABELS[invitation.role]} tone="info" />
        </View>
      </Card>

      <Card>
        <Field
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          placeholder="Your name"
        />
        <Field
          label="Create password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="8+ characters"
        />
        <AppText variant="caption" color={colors.textSubtle}>
          Your organization and access level come securely from this invitation.
        </AppText>
        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button label="Join workspace" loading={pending} onPress={submit} />
      </Card>
    </Screen>
  );
}
