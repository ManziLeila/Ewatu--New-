import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EwatuRole } from './ewatu-role';
import type { AuthUser } from './auth-user';
import { REQUIRES_MODULE_KEY } from './requires-module.decorator';
import {
  MODULE_ENTITLEMENTS_RESOLVER,
  type ModuleEntitlementsResolver,
} from './module-entitlements.resolver';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(MODULE_ENTITLEMENTS_RESOLVER)
    private readonly resolver?: ModuleEntitlementsResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleId = this.reflector.getAllAndOverride<string | undefined>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleId) return true;
    if (!this.resolver) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user?.tenant_id) {
      throw new ForbiddenException({
        message: 'MODULE_DISABLED',
        moduleId,
        reason: 'NO_TENANT',
      });
    }
    if (user.roles?.includes(EwatuRole.PLATFORM_SUPER_ADMIN)) {
      return true;
    }

    const enabled = await this.resolver.getEnabledModules(user.tenant_id);
    if (!enabled.includes(moduleId)) {
      throw new ForbiddenException({
        message: 'MODULE_DISABLED',
        moduleId,
      });
    }
    return true;
  }
}
