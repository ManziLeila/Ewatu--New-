import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalController } from './internal.controller';
import { InternalApiGuard } from './internal-api.guard';
import { TenantPurgeService } from './tenant-purge.service';

@Module({
  imports: [PrismaModule],
  controllers: [InternalController],
  providers: [InternalApiGuard, TenantPurgeService],
})
export class InternalModule {}
