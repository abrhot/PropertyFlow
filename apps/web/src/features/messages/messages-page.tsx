'use client';

import { ApiError } from '@propertyflow/api-client';
import { ROLE_LABELS } from '@propertyflow/constants';
import type { Conversation } from '@propertyflow/types';
import {
  createConversationSchema,
  createMessageSchema,
  type CreateConversationInput,
  type CreateMessageInput,
} from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, MessageSquarePlus, Search, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-context';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';
import { messageKeys } from './queries';

function initials(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '#';
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function MessagesContent() {
  const { user } = useAuth();
  /** Only admin/manager message residents; tenants message management. */
  const isStaff = user?.role === 'ORG_ADMIN' || user?.role === 'PROPERTY_MANAGER';
  const [search, setSearch] = useState('');
  const deferredSearch = useDebounced(search);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const conversations = useQuery({
    queryKey: messageKeys.list(deferredSearch),
    queryFn: () => api.listConversations({ search: deferredSearch || undefined }),
    placeholderData: (previous) => previous,
  });

  const list = conversations.data?.conversations ?? [];
  const selectedId = activeId ?? list[0]?.id ?? null;

  return (
    <DashboardShell title="Messages">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl flex-col gap-4">
        <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isStaff
                ? 'Resident conversations for buildings you manage.'
                : 'Message your property management team.'}
            </p>
          </div>
          <Button onClick={() => setComposerOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search…"
                  className="h-9 bg-background pl-9"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {conversations.isLoading ? 'Loading…' : 'No conversations yet.'}
                  </p>
                </div>
              )}
              {list.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === selectedId}
                  onSelect={() => setActiveId(conversation.id)}
                />
              ))}
            </div>
          </aside>

          {selectedId ? (
            <ConversationThread
              conversationId={selectedId}
              currentUserId={user?.id ?? ''}
              isStaff={isStaff}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Select a conversation or start a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={composerOpen}
        isStaff={isStaff}
        onOpenChange={setComposerOpen}
        onCreated={(id) => setActiveId(id)}
      />
    </DashboardShell>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
        active ? 'bg-primary/8' : 'hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {initials(conversation.subject)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{conversation.subject}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeTime(conversation.lastMessageAt)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {conversation.lastMessage.senderName
            ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body}`
            : 'No messages yet'}
        </span>
      </span>
    </button>
  );
}

function ConversationThread({
  conversationId,
  currentUserId,
  isStaff,
}: {
  conversationId: string;
  currentUserId: string;
  isStaff: boolean;
}) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const detail = useQuery({
    queryKey: messageKeys.detail(conversationId),
    queryFn: () => api.getConversation(conversationId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMessageInput>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: { body: '' },
  });

  const send = useMutation({
    mutationFn: (input: CreateMessageInput) => api.sendMessage(conversationId, input),
    onSuccess: async () => {
      reset({ body: '' });
      await queryClient.invalidateQueries({ queryKey: messageKeys.detail(conversationId) });
      await queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to send message'),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [detail.data?.messages.length]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(detail.data?.subject ?? 'Conversation')}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{detail.data?.subject ?? 'Conversation'}</h3>
          <p className="text-xs text-muted-foreground">
            {detail.data
              ? `${detail.data.messageCount} message${detail.data.messageCount === 1 ? '' : 's'}`
              : ''}
            {isStaff ? ' · Resident thread' : ' · Management team'}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6"
      >
        {detail.data?.messages.map((message) => {
          const mine = message.sender.id === currentUserId;
          return (
            <div
              key={message.id}
              className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}
            >
              {!mine && (
                <span className="px-1 text-[11px] font-medium text-muted-foreground">
                  {message.sender.fullName}
                  <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] font-normal">
                    {ROLE_LABELS[message.sender.role]}
                  </Badge>
                </span>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft sm:max-w-[70%]',
                  mine
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md border bg-card',
                )}
              >
                {message.body}
              </div>
              <span className="px-1 text-[11px] text-muted-foreground">
                {mine ? 'You' : ''} {relativeTime(message.createdAt)}
              </span>
            </div>
          );
        })}
        {detail.isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
        )}
      </div>

      <form
        className="shrink-0 border-t bg-card p-3 sm:p-4"
        onSubmit={handleSubmit((input) => send.mutate(input))}
      >
        <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <Textarea
            rows={2}
            placeholder="Write a reply…"
            className="min-h-[2.75rem] flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
            {...register('body')}
          />
          <Button type="submit" size="sm" className="shrink-0" disabled={send.isPending}>
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
        {errors.body && <p className="mt-1.5 text-sm text-destructive">{errors.body.message}</p>}
      </form>
    </div>
  );
}

function NewConversationDialog({
  open,
  isStaff,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  isStaff: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateConversationInput>({
    resolver: zodResolver(createConversationSchema),
    defaultValues: { subject: '', body: '', participantId: undefined },
  });

  const options = useQuery({
    queryKey: messageKeys.options(),
    queryFn: () => api.listMessagingOptions(),
    enabled: open && isStaff,
  });

  const create = useMutation({
    mutationFn: (input: CreateConversationInput) => api.createConversation(input),
    onSuccess: async (conversation) => {
      toast.success('Conversation started');
      reset({ subject: '', body: '', participantId: undefined });
      await queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
      onCreated(conversation.id);
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to start conversation'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            {isStaff
              ? 'Message a resident in your organization.'
              : 'Send a message to your management team.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="conversation-form"
          className="space-y-4"
          onSubmit={handleSubmit((input) => create.mutate(input))}
        >
          {isStaff && (
            <div className="space-y-2">
              <Label htmlFor="conversation-resident">Resident</Label>
              <Controller
                name="participantId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="conversation-resident" className="bg-background">
                      <SelectValue placeholder="Select a resident" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.data?.contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.fullName} — {contact.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.participantId && (
                <p className="text-sm text-destructive">{errors.participantId.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="conversation-subject">Subject</Label>
            <Input
              id="conversation-subject"
              placeholder="What is this about?"
              className="bg-background"
              {...register('subject')}
            />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversation-body">Message</Label>
            <Textarea
              id="conversation-body"
              rows={4}
              placeholder="Write your message…"
              className="bg-background"
              {...register('body')}
            />
            {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="conversation-form" disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MessagesPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="messages">
        <MessagesContent />
      </RequireAbility>
    </RequireAuth>
  );
}
