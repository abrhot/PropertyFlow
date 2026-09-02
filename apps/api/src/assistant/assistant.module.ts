import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { LeasesModule } from '../leases/leases.module';
import { ListingsModule } from '../listings/listings.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [DashboardModule, ListingsModule, LeasesModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
