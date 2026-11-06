import { Module } from '@nestjs/common';
import { NotifyModule } from '../notify/notify.module';
import { TenantController } from './tenant.controller';
import { TenantPurgeOrchestrator } from './tenant-purge.orchestrator';
import { TenantService } from './tenant.service';

@Module({
  imports: [NotifyModule],
  controllers: [TenantController],
  providers: [TenantService, TenantPurgeOrchestrator],
  exports: [TenantService],
})
export class TenantModule {}
