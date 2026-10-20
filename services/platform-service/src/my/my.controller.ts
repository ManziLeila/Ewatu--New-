import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { AllowTenantStatus, AuthUser, CurrentUser, EwatuRole, JwtAuthGuard, Roles, RolesGuard } from '@ewatu/common-auth';
import { TenantService } from '../tenant/tenant.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UpdateTenantSettingsDto } from './dtos/update-tenant-settings.dto';

@Controller('my')
export class MyController {
  constructor(
    private readonly tenant: TenantService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Current user's company (tenant), if they belong to one. Reachable regardless of tenant
   *  status so a blocked user's frontend can still show the right screen. */
  @UseGuards(JwtAuthGuard)
  @AllowTenantStatus('SUSPENDED', 'EXPIRED', 'PENDING_ACTIVATION', 'REJECTED')
  @Get('capabilities')
  async myCapabilities(@CurrentUser() user: AuthUser) {
    return this.entitlements.buildCapabilities(user.tenant_id, user.roles, user.permissions);
  }

  @UseGuards(JwtAuthGuard)
  @AllowTenantStatus('SUSPENDED', 'EXPIRED', 'PENDING_ACTIVATION', 'REJECTED')
  @Get('tenant')
  myTenant(@CurrentUser() user: AuthUser) {
    if (!user.tenant_id) {
      return null;
    }
    return this.tenant.findById(user.tenant_id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.PLATFORM_SUPER_ADMIN)
  @Patch('tenant/settings')
  async updateSettings(@CurrentUser() user: AuthUser, @Body() body: UpdateTenantSettingsDto) {
    if (!user.tenant_id) {
      throw new ForbiddenException('No company linked to this account');
    }
    return this.tenant.updateSettings(user.tenant_id, body);
  }
}
