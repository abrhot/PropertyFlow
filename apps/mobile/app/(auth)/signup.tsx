import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { registerSchema } from '@propertyflow/validation';
import { AppText, AuthScreen, Button, Field } from '@/components/ui';
import { LogoMark } from '@/components/logo';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/features/theme/theme-context';
import { formatApiError } from '@/lib/errors';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors, spacing } = useTheme();

  const [organizationName, setOrganizationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    const parsed = registerSchema.safeParse({ organizationName, fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }
    setPending(true);
    try {
      await signUp(parsed.data);
    } catch (err) {
      setError(formatApiError(err, 'Could not create your account.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      topRight={
        <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={10}>
          <AppText variant="caption" color={colors.textMuted}>
            Sign in
          </AppText>
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <LogoMark size={32} />
        <AppText variant="title">PropertyFlow</AppText>
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="h2">Create workspace</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          First account becomes the admin
        </AppText>
      </View>

      <Field value={organizationName} onChangeText={setOrganizationName} placeholder="Company name" />
      <Field value={fullName} onChangeText={setFullName} placeholder="Your name" autoComplete="name" />
      <Field
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Work email"
      />
      <Field
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password · 8+ chars"
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      <Button label="Create account" compact inline loading={pending} onPress={() => void submit()} />
    </AuthScreen>
  );
}
