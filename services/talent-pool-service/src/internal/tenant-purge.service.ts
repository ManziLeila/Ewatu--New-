import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction([
      this.prisma.talentPoolProfile.deleteMany({ where: { tenantId } }),
      this.prisma.savedSearch.deleteMany({ where: { tenantId } }),
      this.prisma.talentPool.deleteMany({ where: { tenantId } }),
    ]);
    return { tenantId, purged: true };
  }
}
