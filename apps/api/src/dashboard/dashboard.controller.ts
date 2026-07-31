import { Controller, Get } from '@nestjs/common';
import type { DashboardSummaryResponse, RequestUser } from '@propertyflow/types';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @CheckAbility({ action: 'access', subject: 'dashboard' })
  summary(@CurrentUser() user: RequestUser): Promise<DashboardSummaryResponse> {
    return this.dashboard.summary(user);
  }
}
