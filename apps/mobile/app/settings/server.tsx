import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PageHeader } from '@/components/page-header';
import { AppText, Banner, Button, Card, Field, Screen } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import {
  getApiOrigin,
  getDefaultApiOrigin,
  resetApiOrigin,
  saveApiOrigin,
  testApiOrigin,
} from '@/lib/server-config';

/**
 * Lets the user repoint the app at the machine running the API. A phone can only
 * reach the API over the LAN, and that address changes with the Wi-Fi network, so
 * without this a network change would require a whole new build.
 */
export default function ServerSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing } = useTheme();

  const [address, setAddress] = useState(getApiOrigin());
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function runTest() {
    setTesting(true);
    setSaved(false);
    setResult(await testApiOrigin(address));
    setTesting(false);
  }

  async function save() {
    const next = await saveApiOrigin(address);
    setAddress(next);
    // Cached failures were produced against the old address.
    queryClient.clear();
    setSaved(true);
    setResult(null);
  }

  async function reset() {
    const next = await resetApiOrigin();
    setAddress(next);
    queryClient.clear();
    setResult(null);
    setSaved(true);
  }

  return (
    <Screen>
      <PageHeader title="Server address" subtitle="Where this app looks for the API" backIcon="close" />

      <Card>
        <AppText variant="body" color={colors.textMuted}>
          Your phone reaches the PropertyFlow API over Wi-Fi, so it needs the computer's network
          address — not `localhost`. If sign-in stops working after switching networks, update it here.
        </AppText>
        <Field
          label="API address"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.20:3001"
        />
        <AppText variant="caption" color={colors.textSubtle}>
          Built-in default: {getDefaultApiOrigin()}
        </AppText>

        {result ? <Banner tone={result.ok ? 'success' : 'danger'} message={result.message} /> : null}
        {saved ? <Banner tone="success" message="Saved. Sign in again to use the new address." /> : null}

        <View style={{ gap: spacing.sm }}>
          <Button label="Test connection" variant="secondary" loading={testing} onPress={runTest} />
          <Button label="Save address" onPress={save} />
          <Button label="Reset to default" variant="ghost" onPress={reset} />
        </View>
      </Card>

      <Card>
        <AppText variant="h2">Finding the address</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          On the computer running the API, open a terminal and run `ipconfig` (Windows) or `ifconfig`
          (macOS/Linux), then use the IPv4 address of your Wi-Fi adapter with port 3001. Both devices
          must be on the same network.
        </AppText>
      </Card>

      <Button label="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
