import { Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from './internal-api.guard';
import { TenantService } from '../tenant/tenant.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(
    private readonly tenant: TenantService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('tenants/by-slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    const t = await this.tenant.findBySlug(slug);
    if (!t) throw new NotFoundException();
    return { id: t.id, name: t.name, slug: t.slug, status: t.status };
  }

  @Get('tenants/:id')
  async byId(@Param('id') id: string) {
    const t = await this.tenant.findById(id);
    if (!t) throw new NotFoundException();
    return { id: t.id, name: t.name, slug: t.slug, status: t.status };
  }

  /** Enabled product module IDs for a tenant (services cache this). */
  @Get('tenants/:id/modules')
  async tenantModules(@Param('id') id: string) {
    const t = await this.tenant.findById(id);
    if (!t) throw new NotFoundException();
    const enabledModules = await this.entitlements.getEnabledModuleIds(id, []);
    return { tenantId: id, enabledModules };
  }

  @Patch('tenants/:tenantId/email-verified')
  markEmailVerified(@Param('tenantId') tenantId: string) {
    return this.tenant.markOwnerEmailVerified(tenantId);
  }
}

