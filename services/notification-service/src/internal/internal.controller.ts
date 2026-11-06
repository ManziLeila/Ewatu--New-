import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { InternalDispatchDto } from './dispatch.dto';
import { InternalApiGuard } from './internal-api.guard';
import { TenantPurgeService } from './tenant-purge.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly tenantPurge: TenantPurgeService,
  ) {}

  @Post('dispatch')
  dispatch(@Body() body: InternalDispatchDto) {
    return this.notifications.dispatch(body);
  }

  @Delete('tenants/:tenantId')
  purgeTenant(@Param('tenantId') tenantId: string) {
    return this.tenantPurge.purgeTenant(tenantId);
  }
}
