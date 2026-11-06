import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalController } from './internal.controller';
import { InternalApiGuard } from './internal-api.guard';
import { TenantPurgeService } from './tenant-purge.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [InternalController],
  providers: [InternalApiGuard, TenantPurgeService],
})
export class InternalModule {}
