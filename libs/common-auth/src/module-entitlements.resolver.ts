export const MODULE_ENTITLEMENTS_RESOLVER = Symbol('MODULE_ENTITLEMENTS_RESOLVER');

/** Resolve enabled product module IDs for a tenant (implemented per service). */
export interface ModuleEntitlementsResolver {
  getEnabledModules(tenantId: string): Promise<string[]>;
}
