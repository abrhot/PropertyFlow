import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '@propertyflow/api-client';
import { resetPasswordSchema } from '@propertyflow/validation';
import { AppText, Button, Card, EmptyState, Field, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/features/theme/theme-context';

export default function ResetPasswordScreen() {
  const { colors, spacing, radius } = useTheme();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your password.');
      return;
    }
    setPending(true);
    try {
      await api.resetPassword(parsed.data);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset your password.');
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <EmptyState
          title="Reset link unavailable"
          subtitle="Request a new password reset link to continue."
        />
        <Button
          label="Request new link"
          variant="secondary"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: spacing.xl }}>
      <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
        <Ionicons name="close" size={26} color={colors.primary} />
      </Pressable>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="h1">{done ? 'Password updated' : 'Create new password'}</AppText>
        <AppText variant="body" color={colors.textMuted}>
          {done
            ? 'You can now sign in with your new password.'
            : 'Use at least 8 characters with uppercase, lowercase, and a number.'}
        </AppText>
      </View>

      {done ? (
        <Button label="Sign in" onPress={() => router.replace('/(auth)/login')} />
      ) : (
        <Card>
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Your new password"
          />
          {error ? (
            <AppText variant="caption" color={colors.danger}>
              {error}
            </AppText>
          ) : null}
          <Button label="Update password" loading={pending} onPress={submit} />
        </Card>
      )}
    </Screen>
  );
}
