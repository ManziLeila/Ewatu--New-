import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { InternalController } from './internal.controller';
import { InternalApiGuard } from './internal-api.guard';

@Module({
  imports: [TenantModule, EntitlementsModule],
  controllers: [InternalController],
  providers: [InternalApiGuard],
})
export class InternalModule {}
