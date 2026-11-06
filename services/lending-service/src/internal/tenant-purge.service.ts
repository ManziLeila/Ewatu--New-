import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.loanRepayment.deleteMany({ where: { tenantId } });
      await tx.repaymentSchedule.deleteMany({ where: { tenantId } });
      await tx.loanCollateral.deleteMany({ where: { tenantId } });
      await tx.loan.deleteMany({ where: { tenantId } });
      await tx.securityAuditLog.deleteMany({ where: { tenantId } });
    });
    return { tenantId, purged: true };
  }
}
