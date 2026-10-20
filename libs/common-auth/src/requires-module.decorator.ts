import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requires_module';

/** Product module that must be enabled for the tenant (see ModuleGuard). */
export const RequiresModule = (moduleId: string) => SetMetadata(REQUIRES_MODULE_KEY, moduleId);
