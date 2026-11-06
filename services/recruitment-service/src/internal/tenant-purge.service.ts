import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.placement.deleteMany({ where: { tenantId } });
      await tx.interviewScorecard.deleteMany({ where: { tenantId } });
      await tx.interview.deleteMany({ where: { tenantId } });
      await tx.stageHistory.deleteMany({ where: { tenantId } });
      await tx.offer.deleteMany({ where: { tenantId } });
      await tx.application.deleteMany({ where: { tenantId } });
      await tx.candidateActivity.deleteMany({ where: { tenantId } });
      await tx.recruiterNote.deleteMany({ where: { tenantId } });
      await tx.candidateDocument.deleteMany({ where: { tenantId } });
      await tx.candidateLanguage.deleteMany({ where: { tenantId } });
      await tx.education.deleteMany({ where: { tenantId } });
      await tx.workHistory.deleteMany({ where: { tenantId } });
      await tx.candidate.deleteMany({ where: { tenantId } });
      await tx.job.deleteMany({ where: { tenantId } });
    });
    return { tenantId, purged: true };
  }
}
