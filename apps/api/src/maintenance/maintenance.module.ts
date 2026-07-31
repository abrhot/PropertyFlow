import { Module } from '@nestjs/common';
import { MaintenanceRequestsController, WorkOrdersController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [MaintenanceRequestsController, WorkOrdersController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
