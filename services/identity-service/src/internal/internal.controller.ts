import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { ProvisionTenantOwnerDto } from './dtos/provision-tenant-owner.dto';
import { InternalApiGuard } from './internal-api.guard';
import { TenantPurgeService } from './tenant-purge.service';

@SkipThrottle()
@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(
    private readonly auth: AuthService,
    private readonly tenantPurge: TenantPurgeService,
  ) {}

  @Post('provision-tenant-owner')
  provisionTenantOwner(@Body() body: ProvisionTenantOwnerDto) {
    return this.auth.provisionTenantOwner(body);
  }

  /** Lets other services (e.g. payroll-service's notification dispatch) resolve which User
   *  account a person's work email belongs to, so an in-app notification can be addressed to
   *  them. Returns null rather than 404 when there's no match — this is a lookup, not a fetch. */
  @Get('users/by-email')
  findUserIdByEmail(@Query('email') email: string) {
    return this.auth.findUserIdByEmail(email);
  }

  @Get('users/by-id')
  findUserById(@Query('userId') userId: string) {
    return this.auth.findUserById(userId);
  }

  @Delete('tenants/:tenantId')
  purgeTenant(@Param('tenantId') tenantId: string) {
    return this.tenantPurge.purgeTenant(tenantId);
  }

  @Get('users/by-tenant-roles')
  async findUsersByTenantRoles(
    @Query('tenantId') tenantId: string,
    @Query('roles') rolesCsv: string,
  ) {
    const roles = (rolesCsv ?? '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const data = await this.auth.findUsersByTenantRoles(tenantId, roles);
    return { data };
  }
}
