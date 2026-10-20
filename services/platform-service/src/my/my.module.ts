import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { MyController } from './my.controller';

@Module({
  imports: [TenantModule, EntitlementsModule],
  controllers: [MyController],
})
export class MyModule {}
