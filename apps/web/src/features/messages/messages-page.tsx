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
import { Loader2, MessageSquarePlus, Search, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { messageKeys } from './queries';

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
  const isStaff = user?.role !== 'TENANT';
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const conversations = useQuery({
    queryKey: messageKeys.list(search),
    queryFn: () => api.listConversations({ search: search || undefined }),
  });

  const list = conversations.data?.conversations ?? [];
  const selectedId = activeId ?? list[0]?.id ?? null;

  return (
    <DashboardShell title="Messages">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
            <p className="mt-1 text-muted-foreground">
              {isStaff
                ? 'Conversations with your residents.'
                : 'Talk directly with your management team.'}
            </p>
          </div>
          <Button onClick={() => setComposerOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[32rem] divide-y overflow-y-auto">
              {list.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {conversations.isLoading ? 'Loading…' : 'No conversations yet.'}
                </p>
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
          </Card>

          {selectedId ? (
            <ConversationThread conversationId={selectedId} currentUserId={user?.id ?? ''} />
          ) : (
            <Card className="flex items-center justify-center">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Select or start a conversation to see the messages.
              </CardContent>
            </Card>
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
        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{conversation.subject}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(conversation.lastMessageAt)}
        </span>
      </div>
      <span className="truncate text-sm text-muted-foreground">
        {conversation.lastMessage.senderName
          ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body}`
          : 'No messages yet'}
      </span>
    </button>
  );
}

function ConversationThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
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
    <Card className="flex flex-col">
      <div className="border-b px-5 py-4">
        <h3 className="font-semibold">{detail.data?.subject ?? 'Conversation'}</h3>
        <p className="text-xs text-muted-foreground">
          {detail.data ? `${detail.data.messageCount} message${detail.data.messageCount === 1 ? '' : 's'}` : ''}
        </p>
      </div>
      <div ref={scrollRef} className="flex max-h-[26rem] min-h-[16rem] flex-col gap-3 overflow-y-auto p-5">
        {detail.data?.messages.map((message) => {
          const mine = message.sender.id === currentUserId;
          return (
            <div key={message.id} className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {message.body}
              </div>
              <span className="px-1 text-[11px] text-muted-foreground">
                {mine ? 'You' : `${message.sender.fullName} · ${ROLE_LABELS[message.sender.role]}`} ·{' '}
                {relativeTime(message.createdAt)}
              </span>
            </div>
          );
        })}
        {detail.isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
      </div>
      <form
        className="flex items-start gap-2 border-t p-3"
        onSubmit={handleSubmit((input) => send.mutate(input))}
      >
        <div className="flex-1">
          <Textarea rows={2} placeholder="Write a reply..." {...register('body')} />
          {errors.body && <p className="mt-1 text-sm text-destructive">{errors.body.message}</p>}
        </div>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </form>
    </Card>
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
              ? 'Reach out to one of your residents.'
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
                    <SelectTrigger id="conversation-resident">
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
            <Input id="conversation-subject" placeholder="What is this about?" {...register('subject')} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversation-body">Message</Label>
            <Textarea id="conversation-body" rows={4} placeholder="Write your message..." {...register('body')} />
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
