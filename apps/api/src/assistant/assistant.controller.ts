import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import type { RequestUser } from '@propertyflow/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AssistantService } from './assistant.service';
import type { AssistantRequest, AssistantResponse } from './assistant.types';

const assistantMessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) });
const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(assistantMessageSchema).max(12).optional(),
  attachment: z
    .object({
      mimeType: z.enum([
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'application/pdf',
      ]),
      data: z.string().min(32).max(16_000_000),
    })
    .optional(),
});

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Public()
  @Post('chat')
  chat(
    @CurrentUser() user: RequestUser | undefined,
    @Body(new ZodValidationPipe(assistantRequestSchema)) input: AssistantRequest,
  ): Promise<AssistantResponse> {
    return this.assistant.chat(user, input);
  }
}
