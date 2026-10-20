import { Global, Module } from '@nestjs/common';
import { MODULE_ENTITLEMENTS_RESOLVER, ModuleGuard } from '@ewatu/common-auth';
import { PlatformEntitlementsService } from './platform-entitlements.service';

@Global()
@Module({
  providers: [
    PlatformEntitlementsService,
    ModuleGuard,
    {
      provide: MODULE_ENTITLEMENTS_RESOLVER,
      useExisting: PlatformEntitlementsService,
    },
  ],
  exports: [PlatformEntitlementsService, ModuleGuard, MODULE_ENTITLEMENTS_RESOLVER],
})
export class RecruitmentCommonModule {}
