import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { ForceLightTheme } from '@/features/theme/theme-context';
import { hasSeenWelcome, subscribeWelcomeSeen } from '@/lib/onboarding';

export default function AuthLayout() {
  const { status } = useAuth();
  const pathname = usePathname();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    hasSeenWelcome().then((seen) => {
      if (active) setWelcomeSeen(seen);
    });
    const unsubscribe = subscribeWelcomeSeen(setWelcomeSeen);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (status === 'authenticated') return <Redirect href="/(tabs)" />;

  const onIntro =
    pathname.includes('welcome') || pathname.includes('intro') || pathname.includes('listing');
  if (welcomeSeen === false && !onIntro) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <ForceLightTheme>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </ForceLightTheme>
  );
}
