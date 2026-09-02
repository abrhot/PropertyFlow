import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import { forgotPasswordSchema } from '@propertyflow/validation';
import { AppText, Button, Card, Field, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/features/theme/theme-context';

export default function ForgotPasswordScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email.');
      return;
    }
    setPending(true);
    try {
      const result = await api.forgotPassword(parsed.data);
      setSent(true);
      if (result.devToken) {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { token: result.devToken },
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to request a reset.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen contentStyle={{ paddingTop: spacing.xl }}>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </Pressable>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="h1">Reset password</AppText>
        <AppText variant="body" color={colors.textMuted}>
          Enter your email and we’ll send you a secure reset link.
        </AppText>
      </View>

      {sent ? (
        <Card>
          <Ionicons name="mail-outline" size={28} color={colors.accent} />
          <AppText variant="title">Check your inbox</AppText>
          <AppText variant="body" color={colors.textMuted}>
            If an account exists for {email}, a reset link is on its way.
          </AppText>
          <Button
            label="Back to sign in"
            variant="secondary"
            onPress={() => router.replace('/(auth)/login')}
          />
        </Card>
      ) : (
        <Card>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@email.com"
          />
          {error ? (
            <AppText variant="caption" color={colors.danger}>
              {error}
            </AppText>
          ) : null}
          <Button label="Send reset link" loading={pending} onPress={submit} />
        </Card>
      )}
    </Screen>
  );
}
