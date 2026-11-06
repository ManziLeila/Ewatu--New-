import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { tenantId } }),
      this.prisma.user.deleteMany({ where: { tenantId } }),
    ]);
    return { tenantId, purged: true };
  }
}
