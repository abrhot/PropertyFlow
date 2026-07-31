import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { resource } from '@propertyflow/auth';
import { Prisma } from '@propertyflow/database';
import type {
  Conversation,
  ConversationDetail,
  ConversationListResponse,
  Message,
  MessagingOptions,
  RequestUser,
} from '@propertyflow/types';
import type {
  CreateConversationInput,
  CreateMessageInput,
  ListConversationsQuery,
} from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { PrismaService } from '../prisma/prisma.service';

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.MessageSelect;
type MessageRecord = Prisma.MessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const CONVERSATION_SELECT = {
  id: true,
  organizationId: true,
  subject: true,
  participantIds: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { messages: true } },
  messages: { select: MESSAGE_SELECT, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.ConversationSelect;
type ConversationRecord = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_SELECT }>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: AbilityService,
  ) {}

  async list(user: RequestUser, query: ListConversationsQuery): Promise<ConversationListResponse> {
    const organizationId = requireOrg(user);
    const where: Prisma.ConversationWhereInput = {
      organizationId,
      ...this.scopeWhere(user, organizationId),
      ...(query.search
        ? { subject: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const records = await this.prisma.client.conversation.findMany({
      where,
      select: CONVERSATION_SELECT,
      orderBy: { lastMessageAt: 'desc' },
    });
    const conversations = records.map(toConversation);
    return {
      conversations,
      summary: {
        conversationCount: conversations.length,
        unreadHint: records.filter((record) => {
          const last = record.messages[0];
          return last ? last.sender.id !== user.id : false;
        }).length,
      },
    };
  }

  async options(user: RequestUser): Promise<MessagingOptions> {
    const organizationId = requireOrg(user);
    if (!this.isStaff(user, organizationId)) return { contacts: [] };
    const tenants = await this.prisma.client.user.findMany({
      where: { organizationId, role: 'TENANT', isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    return { contacts: tenants };
  }

  async get(user: RequestUser, id: string): Promise<ConversationDetail> {
    const organizationId = requireOrg(user);
    const record = await this.prisma.client.conversation.findFirst({
      where: { id, organizationId },
      select: { ...CONVERSATION_SELECT, messages: { select: MESSAGE_SELECT, orderBy: { createdAt: 'asc' } } },
    });
    if (!record) throw new NotFoundException('Conversation not found');
    this.assertAccess(user, organizationId, record.participantIds);
    return {
      ...toConversation(record),
      messages: record.messages.map(toMessage),
    };
  }

  async create(user: RequestUser, input: CreateConversationInput): Promise<ConversationDetail> {
    const organizationId = requireOrg(user);
    const staff = this.isStaff(user, organizationId);

    let participantIds: string[];
    if (staff) {
      if (!input.participantId) throw new BadRequestException('Select a resident to message');
      const tenant = await this.prisma.client.user.findFirst({
        where: { id: input.participantId, organizationId, role: 'TENANT' },
        select: { id: true },
      });
      if (!tenant) throw new BadRequestException('Select a resident from your organization');
      participantIds = [tenant.id];
    } else {
      participantIds = [user.id];
    }

    const ability = this.abilities.abilityForUser(user);
    if (!ability.can('create', resource('Message', { organizationId, participantIds }))) {
      throw new ForbiddenException('Not permitted to start a conversation');
    }

    const now = new Date();
    const created = await this.prisma.client.conversation.create({
      data: {
        organizationId,
        subject: input.subject,
        participantIds,
        lastMessageAt: now,
        messages: {
          create: { organizationId, senderId: user.id, body: input.body, createdAt: now },
        },
      },
      select: { ...CONVERSATION_SELECT, messages: { select: MESSAGE_SELECT, orderBy: { createdAt: 'asc' } } },
    });
    return { ...toConversation(created), messages: created.messages.map(toMessage) };
  }

  async sendMessage(user: RequestUser, id: string, input: CreateMessageInput): Promise<Message> {
    const organizationId = requireOrg(user);
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id, organizationId },
      select: { id: true, participantIds: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertAccess(user, organizationId, conversation.participantIds);

    const now = new Date();
    const [message] = await this.prisma.client.$transaction([
      this.prisma.client.message.create({
        data: { organizationId, conversationId: id, senderId: user.id, body: input.body, createdAt: now },
        select: MESSAGE_SELECT,
      }),
      this.prisma.client.conversation.update({ where: { id }, data: { lastMessageAt: now } }),
    ]);
    return toMessage(message);
  }

  /** True when the caller can see every conversation in the organization (staff). */
  private isStaff(user: RequestUser, organizationId: string): boolean {
    return this.abilities
      .abilityForUser(user)
      .can('read', resource('Message', { organizationId }));
  }

  /** Restricts non-staff callers to conversations they participate in. */
  private scopeWhere(user: RequestUser, organizationId: string): Prisma.ConversationWhereInput {
    return this.isStaff(user, organizationId) ? {} : { participantIds: { has: user.id } };
  }

  private assertAccess(user: RequestUser, organizationId: string, participantIds: string[]): void {
    const ability = this.abilities.abilityForUser(user);
    if (!ability.can('read', resource('Message', { organizationId, participantIds }))) {
      throw new ForbiddenException('Not permitted to view this conversation');
    }
  }
}

function requireOrg(user: RequestUser): string {
  if (!user.organizationId) throw new ForbiddenException('Organization membership is required');
  return user.organizationId;
}

function toMessage(record: MessageRecord): Message {
  return {
    id: record.id,
    conversationId: record.conversationId,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
    sender: { id: record.sender.id, fullName: record.sender.fullName, role: record.sender.role },
  };
}

function toConversation(record: ConversationRecord): Conversation {
  const last = record.messages[0];
  return {
    id: record.id,
    organizationId: record.organizationId,
    subject: record.subject,
    participantIds: record.participantIds,
    lastMessageAt: record.lastMessageAt.toISOString(),
    messageCount: record._count.messages,
    lastMessage: last
      ? { body: last.body, createdAt: last.createdAt.toISOString(), senderName: last.sender.fullName }
      : { body: '', createdAt: record.createdAt.toISOString(), senderName: '' },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
