import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeTenant(tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.feedbackResponse.deleteMany({
        where: { request: { tenantId } },
      });
      await tx.appraisalGoalRating.deleteMany({
        where: { appraisal: { tenantId } },
      });
      await tx.appraisalCompetencyRating.deleteMany({
        where: { appraisal: { tenantId } },
      });
      await tx.pipCheckIn.deleteMany({
        where: { pip: { tenantId } },
      });

      await tx.payrollRecord.deleteMany({ where: { tenantId } });
      await tx.payrollApproval.deleteMany({ where: { tenantId } });
      await tx.bankPaymentFile.deleteMany({ where: { tenantId } });
      await tx.payrollPeriod.deleteMany({ where: { tenantId } });

      await tx.teamKpiSubmission.deleteMany({ where: { tenantId } });
      await tx.feedbackRequest.deleteMany({ where: { tenantId } });
      await tx.performanceImprovementPlan.deleteMany({ where: { tenantId } });
      await tx.appraisal.deleteMany({ where: { tenantId } });
      await tx.goal.deleteMany({ where: { tenantId } });
      await tx.goalTemplate.deleteMany({ where: { tenantId } });
      await tx.kpiPeriod.deleteMany({ where: { tenantId } });
      await tx.appraisalCycle.deleteMany({ where: { tenantId } });
      await tx.competencyFramework.deleteMany({ where: { tenantId } });

      await tx.leaveRequest.deleteMany({ where: { tenantId } });
      await tx.leaveBalance.deleteMany({ where: { tenantId } });
      await tx.leaveType.deleteMany({ where: { tenantId } });
      await tx.holiday.deleteMany({ where: { tenantId } });

      await tx.permitChecklistItem.deleteMany({ where: { tenantId } });
      await tx.permit.deleteMany({ where: { tenantId } });
      await tx.trainingRecord.deleteMany({ where: { tenantId } });
      await tx.trainingCourse.deleteMany({ where: { tenantId } });
      await tx.attendanceRecord.deleteMany({ where: { tenantId } });
      await tx.grievanceCase.deleteMany({ where: { tenantId } });
      await tx.task.deleteMany({ where: { tenantId } });
      await tx.announcement.deleteMany({ where: { tenantId } });
      await tx.teamMember.deleteMany({ where: { tenantId } });
      await tx.team.deleteMany({ where: { tenantId } });

      await tx.deploymentHistory.deleteMany({ where: { tenantId } });
      await tx.contractAmendment.deleteMany({ where: { tenantId } });
      await tx.secondmentContract.deleteMany({ where: { tenantId } });
      await tx.outsourcingAssignment.deleteMany({ where: { tenantId } });
      await tx.employeeContract.deleteMany({ where: { tenantId } });
      await tx.employeeDocument.deleteMany({ where: { tenantId } });

      await tx.employee.updateMany({
        where: { tenantId },
        data: { managerId: null },
      });
      await tx.employee.deleteMany({ where: { tenantId } });

      await tx.payrollConfiguration.deleteMany({ where: { tenantId } });
      await tx.attendanceNetworkPolicy.deleteMany({ where: { tenantId } });
      await tx.securityAuditLog.deleteMany({ where: { tenantId } });
    });
    return { tenantId, purged: true };
  }
}
