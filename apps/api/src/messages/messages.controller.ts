import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type {
  ConversationDetail,
  ConversationListResponse,
  Message,
  MessagingOptions,
  RequestUser,
} from '@propertyflow/types';
import {
  createConversationSchema,
  createMessageSchema,
  listConversationsQuerySchema,
  type CreateConversationInput,
  type CreateMessageInput,
  type ListConversationsQuery,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MessagesService } from './messages.service';

@Controller('conversations')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Message' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listConversationsQuerySchema)) query: ListConversationsQuery,
  ): Promise<ConversationListResponse> {
    return this.messages.list(user, query);
  }

  @Get('options')
  @CheckAbility({ action: 'read', subject: 'Message' })
  options(@CurrentUser() user: RequestUser): Promise<MessagingOptions> {
    return this.messages.options(user);
  }

  @Get(':id')
  @CheckAbility({ action: 'read', subject: 'Message' })
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ConversationDetail> {
    return this.messages.get(user, id);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'Message' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createConversationSchema)) input: CreateConversationInput,
  ): Promise<ConversationDetail> {
    return this.messages.create(user, input);
  }

  @Post(':id/messages')
  @CheckAbility({ action: 'create', subject: 'Message' })
  send(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(createMessageSchema)) input: CreateMessageInput,
  ): Promise<Message> {
    return this.messages.sendMessage(user, id, input);
  }
}
