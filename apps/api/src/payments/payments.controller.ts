import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { Payment, PaymentFormOptions, PaymentListResponse, RequestUser } from '@propertyflow/types';
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type ListPaymentsQuery,
  type UpdatePaymentInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Payment' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listPaymentsQuerySchema)) query: ListPaymentsQuery,
  ): Promise<PaymentListResponse> {
    return this.payments.list(user, query);
  }

  @Get('options')
  @CheckAbility({ action: 'create', subject: 'Payment' })
  formOptions(@CurrentUser() user: RequestUser): Promise<PaymentFormOptions> {
    return this.payments.formOptions(user);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'Payment' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPaymentSchema)) input: CreatePaymentInput,
  ): Promise<Payment> {
    return this.payments.create(user, input);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'Payment' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) input: UpdatePaymentInput,
  ): Promise<Payment> {
    return this.payments.update(user, id, input);
  }

  @Post(':id/pay')
  @CheckAbility({ action: 'pay', subject: 'Payment' })
  pay(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Payment> {
    return this.payments.pay(user, id);
  }
}
