import { Injectable } from '@nestjs/common';
import {
  DEMO_TENANT_DEFAULT_MODULES,
  MODULE_CATALOG,
  listModuleIds,
  type MenuContribution,
  type ModuleId,
} from '@ewatu/module-sdk';
import { EwatuRole, getPermissionsForRoles, hasPermission } from '@ewatu/common-auth';
import { PrismaService } from '../prisma/prisma.service';

export type CapabilitiesPayload = {
  tenantId: string | null;
  enabledModules: ModuleId[];
  permissions: string[];
  menus: MenuContribution[];
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform super-admin: all catalog modules. */
  isUnrestricted(roles: string[]): boolean {
    return roles.includes(EwatuRole.PLATFORM_SUPER_ADMIN);
  }

  async getEnabledModuleIds(tenantId: string | undefined, roles: string[]): Promise<ModuleId[]> {
    if (this.isUnrestricted(roles)) {
      return listModuleIds();
    }
    if (!tenantId) {
      return ['core'];
    }

    const rows = await this.prisma.tenantModuleEntitlement.findMany({
      where: { tenantId, enabled: true },
    });

    const now = Date.now();
    const fromDb = rows
      .filter((r) => {
        if (r.validFrom && r.validFrom.getTime() > now) return false;
        if (r.validTo && r.validTo.getTime() < now) return false;
        return true;
      })
      .map((r) => r.moduleId as ModuleId);

    if (fromDb.length === 0) {
      return [...DEMO_TENANT_DEFAULT_MODULES];
    }

    const withDeps = new Set<ModuleId>(['core']);
    for (const id of fromDb) {
      withDeps.add(id);
      for (const dep of MODULE_CATALOG[id].dependencies) {
        withDeps.add(dep);
      }
    }
    return [...withDeps];
  }

  async buildCapabilities(
    tenantId: string | undefined,
    roles: string[],
    jwtPermissions?: string[],
  ): Promise<CapabilitiesPayload> {
    const enabledModules = await this.getEnabledModuleIds(tenantId, roles);
    const rolePerms = jwtPermissions?.length ? jwtPermissions : getPermissionsForRoles(roles);

    const modulePermissionIds = new Set<string>();
    for (const modId of enabledModules) {
      for (const p of MODULE_CATALOG[modId].permissions) {
        modulePermissionIds.add(p.id);
      }
    }

    const unrestricted =
      this.isUnrestricted(roles) ||
      roles.includes(EwatuRole.TENANT_ADMIN) ||
      roles.includes(EwatuRole.MANAGING_DIRECTOR);

    const permissions = unrestricted
      ? rolePerms
      : rolePerms.filter(
          (p) =>
            p === '*:*' ||
            modulePermissionIds.has(p) ||
            [...modulePermissionIds].some(
              (mp) => hasPermission([p], mp) || hasPermission([mp], p),
            ),
        );

    const menus: MenuContribution[] = [];
    for (const modId of enabledModules) {
      for (const menu of MODULE_CATALOG[modId].menuContributions) {
        if (!menu.permission || unrestricted || hasPermission(permissions, menu.permission)) {
          menus.push(menu);
        }
      }
    }

    const dedupedMenus = menus.filter(
      (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
    );

    return {
      tenantId: tenantId ?? null,
      enabledModules,
      permissions,
      menus: dedupedMenus,
    };
  }

  async syncDefaultEntitlements(tenantId: string, moduleIds: ModuleId[] = [...DEMO_TENANT_DEFAULT_MODULES]) {
    for (const moduleId of moduleIds) {
      await this.prisma.tenantModuleEntitlement.upsert({
        where: { tenantId_moduleId: { tenantId, moduleId } },
        create: { tenantId, moduleId, enabled: true },
        update: { enabled: true },
      });
    }
  }
}
