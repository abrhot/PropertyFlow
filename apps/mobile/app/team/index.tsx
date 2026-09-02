import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { INVITABLE_ROLES, ROLE_LABELS, type InvitableRole } from '@propertyflow/constants';
import type { InvitationStatus, OrganizationInvitationSummary } from '@propertyflow/types';
import { createInvitationSchema } from '@propertyflow/validation';
import { QueryState } from '@/components/data-state';
import { PageHeader } from '@/components/page-header';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  Field,
  Row,
  Screen,
  Select,
} from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { validate, type FieldErrors } from '@/lib/form';

const ROLE_OPTIONS = INVITABLE_ROLES.map((role) => ({
  label: ROLE_LABELS[role],
  value: role,
}));

const INVITE_TONE: Record<InvitationStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REVOKED: 'danger',
  EXPIRED: 'neutral',
};

export default function TeamScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('PROPERTY_MANAGER');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const invitesQuery = useQuery({
    queryKey: ['organization', 'invitations'],
    queryFn: () => api.listInvitations(),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['organization', 'manager-buildings'],
    queryFn: () => api.listManagerAssignments(),
  });

  const invite = useMutation({
    mutationFn: (payload: { email: string; role: InvitableRole }) => api.createInvitation(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'invitations'] });
      setEmail('');
      setNotice(
        response.devAcceptUrl
          ? `Invitation sent. Dev link: ${response.devAcceptUrl}`
          : `Invitation sent to ${response.invitation.email}.`,
      );
    },
    onError: (err) => setInviteError(formatApiError(err, 'Could not send this invitation.')),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'invitations'] }),
    onError: (err) => Alert.alert('Could not revoke', formatApiError(err, 'Please try again.')),
  });

  const setBuildings = useMutation({
    mutationFn: ({ managerId, propertyIds }: { managerId: string; propertyIds: string[] }) =>
      api.setManagerProperties(managerId, propertyIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'manager-buildings'] }),
    onError: (err) => Alert.alert('Could not save', formatApiError(err, 'Please try again.')),
  });

  function submitInvite() {
    setInviteError(null);
    setNotice(null);
    const result = validate(createInvitationSchema, { email, role });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    invite.mutate(result.data);
  }

  function confirmRevoke(invitation: OrganizationInvitationSummary) {
    Alert.alert('Revoke invitation', `Cancel the invite for ${invitation.email}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revoke.mutate(invitation.id) },
    ]);
  }

  /** Toggling a building saves immediately so there is no hidden dirty state. */
  function toggleBuilding(managerId: string, current: string[], propertyId: string) {
    const propertyIds = current.includes(propertyId)
      ? current.filter((candidate) => candidate !== propertyId)
      : [...current, propertyId];
    setBuildings.mutate({ managerId, propertyIds });
  }

  const invitations = invitesQuery.data ?? [];
  const managers = assignmentsQuery.data?.managers ?? [];
  const properties = assignmentsQuery.data?.properties ?? [];

  return (
    <Screen onRefresh={() => invitesQuery.refetch()} refreshing={invitesQuery.isFetching && !invitesQuery.isLoading}>
      <PageHeader title="Team" subtitle="Invite staff and assign buildings" />

      <Card>
        <AppText variant="h2">Invite a teammate</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          They pick their own password from the invite link. The role cannot be changed afterwards.
        </AppText>
        {inviteError ? <Banner message={inviteError} /> : null}
        {notice ? <Banner tone="success" message={notice} /> : null}
        <Field
          label="Work email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <Select label="Role" value={role} options={ROLE_OPTIONS} onChange={setRole} error={errors.role} />
        <Button label="Send invitation" loading={invite.isPending} onPress={submitInvite} />
      </Card>

      <View style={{ gap: spacing.md }}>
        <AppText variant="h2">Invitations</AppText>
        <QueryState
          isLoading={invitesQuery.isLoading}
          error={invitesQuery.error}
          isEmpty={invitations.length === 0}
          emptyIcon="mail-outline"
          emptyTitle="No invitations yet"
          onRetry={() => invitesQuery.refetch()}
        >
          <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
            {invitations.map((invitation, index) => (
              <View key={invitation.id}>
                {index > 0 ? <Divider /> : null}
                <View style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
                  <Row>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="title" numberOfLines={1}>
                        {invitation.email}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted}>
                        {ROLE_LABELS[invitation.role]} · expires {formatDate(invitation.expiresAt)}
                      </AppText>
                    </View>
                    <Badge label={invitation.status} tone={INVITE_TONE[invitation.status]} />
                  </Row>
                  {invitation.status === 'PENDING' ? (
                    <Button label="Revoke" variant="ghost" compact onPress={() => confirmRevoke(invitation)} />
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </QueryState>
      </View>

      {managers.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="h2">Building assignments</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Managers only see the buildings you select here.
          </AppText>
          {managers.map((manager) => (
            <Card key={manager.id}>
              <AppText variant="title">{manager.fullName}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {manager.email} · {manager.propertyIds.length} of {properties.length} buildings
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {properties.map((property) => {
                  const assigned = manager.propertyIds.includes(property.id);
                  return (
                    <Button
                      key={property.id}
                      label={`${assigned ? '✓  ' : ''}${property.name}`}
                      variant={assigned ? 'accent' : 'secondary'}
                      compact
                      onPress={() => toggleBuilding(manager.id, manager.propertyIds, property.id)}
                    />
                  );
                })}
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
