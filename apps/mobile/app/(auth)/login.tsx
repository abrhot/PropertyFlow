import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ROLE_LABELS, type UserRole } from '@propertyflow/constants';
import { loginSchema } from '@propertyflow/validation';
import { AppText, AuthScreen, Banner, Button, Field, Select } from '@/components/ui';
import { LogoMark } from '@/components/logo';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { formatApiError } from '@/lib/errors';

const DEMO_PASSWORD = 'Password123';

const DEMOS: { role: UserRole; email: string }[] = [
  { role: 'TENANT', email: 'tenant@demo.test' },
  { role: 'PROPERTY_MANAGER', email: 'manager@demo.test' },
  { role: 'ORG_ADMIN', email: 'orgadmin@demo.test' },
  { role: 'MAINTENANCE', email: 'maintenance@demo.test' },
  { role: 'OWNER', email: 'owner@demo.test' },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const isConnectionError = error != null && /cannot reach the server/i.test(error);

  async function submit(nextEmail: string, nextPassword: string, key: string) {
    setError(null);
    const parsed = loginSchema.safeParse({ email: nextEmail, password: nextPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email and password.');
      return;
    }
    setPending(key);
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (err) {
      setError(formatApiError(err, 'Unable to sign in. Please try again.'));
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthScreen
      topRight={
        <Button
          label="Browse homes"
          variant="secondary"
          compact
          inline
          onPress={() => router.push('/(auth)/intro')}
        />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <LogoMark size={32} />
        <AppText variant="title">PropertyFlow</AppText>
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="h2">Welcome back</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Sign in to continue
        </AppText>
      </View>

      <Field
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="Email"
      />
      <Field
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Password"
      />
      <Pressable
        onPress={() => router.push('/(auth)/forgot-password')}
        hitSlop={8}
        style={{ alignSelf: 'flex-end', marginTop: -4 }}
      >
        <AppText variant="caption" color={colors.primary}>
          Forgot password?
        </AppText>
      </Pressable>

      {error ? <Banner message={error} /> : null}
      {isConnectionError ? (
        <Button
          label="Server address"
          variant="secondary"
          compact
          inline
          onPress={() => router.push('/settings/server')}
        />
      ) : null}

      <Button
        label="Sign in"
        compact
        inline
        loading={pending === 'form'}
        onPress={() => submit(email, password, 'form')}
      />

      <Select
        value={null}
        placeholder="Demo account"
        options={DEMOS.map((account) => ({
          label: ROLE_LABELS[account.role],
          value: account.email,
        }))}
        onChange={(nextEmail) => {
          setEmail(nextEmail);
          setPassword(DEMO_PASSWORD);
          void submit(nextEmail, DEMO_PASSWORD, nextEmail);
        }}
      />

      <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
        New here?{' '}
        <AppText variant="caption" color={colors.primary} onPress={() => router.push('/(auth)/signup')}>
          Create account
        </AppText>
      </AppText>
    </AuthScreen>
  );
}
