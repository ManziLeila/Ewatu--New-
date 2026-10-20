import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ModuleEntitlementsResolver } from '@ewatu/common-auth';
import { DEMO_TENANT_DEFAULT_MODULES, type ModuleId } from '@ewatu/module-sdk';

const CACHE_MS = 90_000;

@Injectable()
export class PlatformEntitlementsService implements ModuleEntitlementsResolver {
  private cache = new Map<string, { modules: string[]; exp: number }>();

  constructor(private readonly config: ConfigService) {}

  async getEnabledModules(tenantId: string): Promise<string[]> {
    const hit = this.cache.get(tenantId);
    if (hit && hit.exp > Date.now()) return hit.modules;

    const base = this.config.get<string>('PLATFORM_SERVICE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!base || !key) {
      return [...DEMO_TENANT_DEFAULT_MODULES];
    }

    const r = await fetch(`${base}/api/v1/internal/tenants/${encodeURIComponent(tenantId)}/modules`, {
      headers: { 'x-internal-key': key },
    });
    if (!r.ok) {
      return [...DEMO_TENANT_DEFAULT_MODULES];
    }
    const json = (await r.json()) as { data?: { enabledModules?: ModuleId[] }; enabledModules?: ModuleId[] };
    const body = json.data ?? json;
    const modules = body.enabledModules?.length ? body.enabledModules : [...DEMO_TENANT_DEFAULT_MODULES];
    this.cache.set(tenantId, { modules, exp: Date.now() + CACHE_MS });
    return modules;
  }
}
