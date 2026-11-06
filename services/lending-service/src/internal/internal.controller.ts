import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from './internal-api.guard';
import { TenantPurgeService } from './tenant-purge.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(private readonly tenantPurge: TenantPurgeService) {}

  @Delete('tenants/:tenantId')
  purgeTenant(@Param('tenantId') tenantId: string) {
    return this.tenantPurge.purgeTenant(tenantId);
  }
}
