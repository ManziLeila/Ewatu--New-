import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalController } from './internal.controller';
import { TenantPurgeService } from './tenant-purge.service';

@Module({
  imports: [NotificationsModule, PrismaModule],
  controllers: [InternalController],
  providers: [TenantPurgeService],
})
export class InternalModule {}
