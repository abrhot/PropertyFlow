import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { LaunchScreen } from '@/components/launch-screen';
import { useAuth } from '@/features/auth/auth-context';
import { hasSeenWelcome } from '@/lib/onboarding';

const INTRO_MS = 1800;

export default function Index() {
  const { status } = useAuth();
  const [introDone, setIntroDone] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const fallback = setTimeout(() => {
      if (active) setWelcomeSeen(false);
    }, 2000);
    hasSeenWelcome()
      .then((seen) => {
        if (active) setWelcomeSeen(seen);
      })
      .catch(() => {
        if (active) setWelcomeSeen(false);
      })
      .finally(() => clearTimeout(fallback));
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, []);

  if (!introDone || status === 'loading' || welcomeSeen === null) return <LaunchScreen />;
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  if (!welcomeSeen) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href="/(auth)/login" />;
}
