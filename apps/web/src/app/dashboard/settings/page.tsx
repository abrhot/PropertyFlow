'use client';

import { useAbility } from '@/features/auth/ability-context';
import { SectionPage } from '@/features/dashboard/section-page';
import { TeamSettingsPage } from '@/features/invitations/team-settings-page';

export default function SettingsPage() {
  const ability = useAbility();
  return ability.can('manage', 'Invitation') ? (
    <TeamSettingsPage />
  ) : (
    <SectionPage section="settings" />
  );
}
