import { Controller, Get } from '@nestjs/common';
import type { BillingOverviewResponse, RequestUser } from '@propertyflow/types';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('overview')
  @CheckAbility({ action: 'access', subject: 'billing' })
  overview(@CurrentUser() user: RequestUser): Promise<BillingOverviewResponse> {
    return this.billing.overview(user);
  }
}
