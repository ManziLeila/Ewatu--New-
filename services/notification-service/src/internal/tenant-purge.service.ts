import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    const { count } = await this.prisma.notification.deleteMany({ where: { tenantId } });
    return { tenantId, purged: true, notificationsRemoved: count };
  }
}
