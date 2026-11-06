import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from './internal-api.guard';
import { PresignService } from '../presign/presign.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalTenantController {
  constructor(private readonly presign: PresignService) {}

  @Delete('tenants/:tenantId')
  purgeTenant(@Param('tenantId') tenantId: string) {
    return this.presign.purgeTenantObjects(tenantId);
  }
}
