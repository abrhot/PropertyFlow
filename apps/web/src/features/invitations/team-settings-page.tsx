'use client';

import { ApiError } from '@propertyflow/api-client';
import {
  INVITABLE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type InvitableRole,
} from '@propertyflow/constants';
import type { InvitationStatus, ManagerSummary } from '@propertyflow/types';
import { createInvitationSchema, type CreateInvitationInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  MailPlus,
  ShieldCheck,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const INVITATIONS_QUERY_KEY = ['organization', 'invitations'] as const;

function statusVariant(status: InvitationStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'PENDING') return 'default';
  if (status === 'ACCEPTED') return 'secondary';
  return 'outline';
}

/**
 * Team invitation management, rendered as a section inside the Settings page.
 * Auth and the `manage Invitation` ability are enforced by the caller.
 */
export function TeamInvitationsSection({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: '', role: 'PROPERTY_MANAGER' },
  });
  const selectedRole = watch('role');

  const invitations = useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: () => api.listInvitations(),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(id),
    onSuccess: async (response) => {
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to revoke invitation');
    },
  });

  async function onSubmit(input: CreateInvitationInput) {
    try {
      const response = await api.createInvitation(input);
      setAcceptUrl(response.devAcceptUrl ?? null);
      reset({ email: '', role: input.role });
      await queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
      toast.success(`Invitation created for ${input.email}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to create invitation');
    }
  }

  async function copyAcceptUrl() {
    if (!acceptUrl) return;
    await navigator.clipboard.writeText(acceptUrl);
    toast.success('Invitation link copied');
  }

  return (
    <section className="space-y-4">
      {!embedded && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">Team &amp; roles</h3>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Server-assigned roles
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Invite people by email and choose exactly what they can access. Roles are stored in the
            invitation and enforced by CASL after acceptance.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRoundPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                New invitation
              </CardTitle>
              <CardDescription>
                The link expires after seven days and can be used only once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Work email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    placeholder="person@company.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Assigned role</Label>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="invite-role">
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {INVITABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[selectedRole]}</p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Send invitation
                </Button>
              </form>

              {acceptUrl && (
                <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Development invitation link</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{acceptUrl}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={copyAcceptUrl}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invitation history</CardTitle>
              <CardDescription>Pending and recently completed team invitations.</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.isLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invitations.isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                  <p className="font-medium">Unable to load invitations</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => invitations.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : invitations.data?.length ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invitee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.data.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div className="flex min-w-48 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {invitation.email.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{invitation.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(invitation.status)}>
                              {invitation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {invitation.status === 'PENDING' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Revoke invitation for ${invitation.email}`}
                                disabled={revoke.isPending}
                                onClick={() => revoke.mutate(invitation.id)}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <MailPlus className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 font-medium">No invitations yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invite your first team member using the form.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ManagerBuildingsSection />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Role access guide</CardTitle>
            <CardDescription>
              These are the organization roles available through secure invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {INVITABLE_ROLES.map((role) => (
              <RoleCard key={role} role={role} />
            ))}
          </CardContent>
        </Card>
    </section>
  );
}

const MANAGERS_QUERY_KEY = ['organization', 'manager-buildings'] as const;

/**
 * Admin control for scoping each property manager to specific buildings. A
 * manager only sees and manages the buildings selected here; admins always see
 * every building.
 */
function ManagerBuildingsSection() {
  const assignments = useQuery({
    queryKey: MANAGERS_QUERY_KEY,
    queryFn: () => api.listManagerAssignments(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          Building assignments
        </CardTitle>
        <CardDescription>
          Choose which buildings each property manager runs. They only see those buildings and
          everything in them; admins always see the whole portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.isLoading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium">Unable to load managers</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => assignments.refetch()}>
              Try again
            </Button>
          </div>
        ) : !assignments.data?.managers.length ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium">No property managers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite a Property Manager, then assign their buildings here.
            </p>
          </div>
        ) : !assignments.data.properties.length ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium">No buildings to assign</p>
            <p className="mt-1 text-sm text-muted-foreground">Add properties first.</p>
          </div>
        ) : (
          assignments.data.managers.map((manager) => (
            <ManagerRow
              key={manager.id}
              manager={manager}
              properties={assignments.data!.properties}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ManagerRow({
  manager,
  properties,
}: {
  manager: ManagerSummary;
  properties: { id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(manager.propertyIds);

  const initial = [...manager.propertyIds].sort().join(',');
  const current = [...selected].sort().join(',');
  const dirty = initial !== current;

  const save = useMutation({
    mutationFn: () => api.setManagerProperties(manager.id, selected),
    onSuccess: async () => {
      toast.success(`Updated buildings for ${manager.fullName}`);
      await queryClient.invalidateQueries({ queryKey: MANAGERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to save assignment');
    },
  });

  const [open, setOpen] = useState(false);

  function toggle(propertyId: string) {
    setSelected((previous) =>
      previous.includes(propertyId)
        ? previous.filter((id) => id !== propertyId)
        : [...previous, propertyId],
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {manager.fullName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{manager.fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">{manager.email}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {dirty && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unsaved changes" />}
          <Badge variant="secondary">
            {selected.length}/{properties.length}
          </Badge>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          <div className="flex flex-wrap gap-2">
            {properties.map((property) => {
              const active = selected.includes(property.id);
              return (
                <Button
                  key={property.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => toggle(property.id)}
                  aria-pressed={active}
                >
                  {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {property.name}
                </Button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Save buildings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({ role }: { role: InvitableRole }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{ROLE_LABELS[role]}</p>
        {role === 'ORG_ADMIN' && <Badge variant="outline">Privileged</Badge>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {ROLE_DESCRIPTIONS[role]}
      </p>
    </div>
  );
}

/**
 * The admin-only Team workspace: invite staff, assign roles, and scope managers
 * to specific buildings. This is the clearest line between an admin (runs the
 * company and its people) and a manager (runs day-to-day operations).
 */
export function TeamPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="team">
        <DashboardShell title="Team">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Team &amp; building access</h2>
              <p className="text-muted-foreground">
                Invite staff, assign roles, and control which buildings each manager can run.
              </p>
            </div>
            <TeamInvitationsSection />
          </div>
        </DashboardShell>
      </RequireAbility>
    </RequireAuth>
  );
}
