import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontFamily } from '@/theme';

const systemText = Platform.OS === 'android' ? { fontFamily } : undefined;
const textDefaults = ((Text as { defaultProps?: { style?: object } }).defaultProps ??= {});
textDefaults.style = [textDefaults.style, systemText];
const inputDefaults = ((TextInput as { defaultProps?: { style?: object } }).defaultProps ??= {});
inputDefaults.style = [inputDefaults.style, systemText];
import { AssistantFab } from '@/components/assistant-fab';
import { AuthProvider } from '@/features/auth/auth-context';
import { ThemeProvider, useTheme } from '@/features/theme/theme-context';
import { queryClient } from '@/lib/query';
import { loadApiOrigin } from '@/lib/server-config';

function RootNavigation() {
  const { colors, isDark } = useTheme();
  const modal = { presentation: 'modal' as const, headerShown: false };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="maintenance/new" options={modal} />
        <Stack.Screen name="conversation/[id]" />
        <Stack.Screen name="conversation/new" options={modal} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="properties/index" />
        <Stack.Screen name="properties/[id]" />
        <Stack.Screen name="properties/edit" options={modal} />
        <Stack.Screen name="units/edit" options={modal} />
        <Stack.Screen name="leases/index" />
        <Stack.Screen name="leases/edit" options={modal} />
        <Stack.Screen name="lease/index" />
        <Stack.Screen name="payments/record" options={modal} />
        <Stack.Screen name="applications/index" />
        <Stack.Screen name="tenants/index" />
        <Stack.Screen name="tenants/new" options={modal} />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="team/index" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/server" options={modal} />
        <Stack.Screen name="assistant" />
      </Stack>
      <AssistantFab />
    </>
  );
}

/** Applies the saved API address before the first request leaves the device. */
function ApiOriginGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let settled = false;
    const fallback = setTimeout(() => {
      if (!settled) setReady(true);
    }, 2000);
    loadApiOrigin().finally(() => {
      settled = true;
      clearTimeout(fallback);
      setReady(true);
    });
    return () => clearTimeout(fallback);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ApiOriginGate>
          <AuthProvider>
            <SafeAreaProvider>
              <RootNavigation />
            </SafeAreaProvider>
          </AuthProvider>
        </ApiOriginGate>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
