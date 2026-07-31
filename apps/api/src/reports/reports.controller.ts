import { Controller, Get } from '@nestjs/common';
import type { ReportDashboardResponse, RequestUser } from '@propertyflow/types';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @CheckAbility({ action: 'read', subject: 'Report' })
  dashboard(@CurrentUser() user: RequestUser): Promise<ReportDashboardResponse> {
    return this.reports.dashboard(user);
  }
}
