import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.goodsReceivedNote.deleteMany({ where: { tenantId } });
      await tx.purchaseOrder.deleteMany({ where: { tenantId } });
      await tx.procurementRequisition.deleteMany({ where: { tenantId } });
      await tx.vendor.deleteMany({ where: { tenantId } });
      await tx.securityAuditLog.deleteMany({ where: { tenantId } });
    });
    return { tenantId, purged: true };
  }
}
