import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { calculatePayroll } from '../calculation/payroll.calculator';
import { dispatchNotification } from '../common/notification.dispatch';
import { notifyTenantRoles } from '../common/payroll-notify';
import { PayslipService } from '../payslip/payslip.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovePeriodDto } from './dto/approve-period.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class PeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payslipService: PayslipService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreatePeriodDto) {
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId, clientId: dto.clientId, periodMonth: dto.periodMonth, periodYear: dto.periodYear },
    });
    if (existing) throw new ConflictException('Payroll period already exists');
    const created = await this.prisma.payrollPeriod.create({
      data: { ...dto, tenantId, preparedBy: userId, status: 'DRAFT' },
    });
    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'CREATE',
      resource: 'payroll_periods',
      resourceId: created.id,
      payload: { periodMonth: created.periodMonth, periodYear: created.periodYear, clientId: created.clientId },
    });
    return created;
  }

  async findAll(tenantId: string, query: Record<string, string | undefined>) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        tenantId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.periodYear ? { periodYear: Number.parseInt(query.periodYear, 10) } : {}),
        ...(query.periodMonth ? { periodMonth: Number.parseInt(query.periodMonth, 10) } : {}),
      },
      include: { _count: { select: { records: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    if (periods.length === 0) return [];

    const aggregates = await this.prisma.payrollRecord.groupBy({
      by: ['periodId'],
      where: { tenantId, periodId: { in: periods.map((p) => p.id) } },
      _sum: { netPay: true, grossPay: true },
      _count: { _all: true },
    });
    const byPeriod = new Map(
      aggregates.map((a) => [
        a.periodId,
        {
          recordCount: a._count._all,
          totalNetPay: Number(a._sum.netPay ?? 0),
          totalGrossPay: Number(a._sum.grossPay ?? 0),
        },
      ]),
    );

    return periods.map((p) => {
      const agg = byPeriod.get(p.id);
      return {
        ...p,
        recordCount: agg?.recordCount ?? p._count.records,
        totalNetPay: agg?.totalNetPay ?? 0,
        totalGrossPay: agg?.totalGrossPay ?? 0,
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: {
        records: { include: { employee: { select: { firstName: true, lastName: true } } } },
        approvals: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    const totals = period.records.reduce(
      (acc, rec) => ({
        gross: acc.gross + Number(rec.grossPay),
        net: acc.net + Number(rec.netPay),
        deductions: acc.deductions + Number(rec.totalDeductions),
      }),
      { gross: 0, net: 0, deductions: 0 },
    );
    return { ...period, totals };
  }

  async runPayroll(tenantId: string, periodId: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status !== 'DRAFT') throw new BadRequestException('Only draft periods can be run');
    const config = await this.prisma.payrollConfiguration.findFirst({
      where: { tenantId, clientId: period.clientId },
    });
    if (!config) {
      throw new BadRequestException(
        'No payroll configuration found for this client. Please set up payroll configuration first.',
      );
    }
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        employmentStatus: 'ACTIVE',
        ...(period.clientId === 'default'
          ? { OR: [{ clientId: period.clientId }, { clientId: null }] }
          : { clientId: period.clientId }),
      },
    });
    for (const employee of employees) {
      const result = calculatePayroll(
        {
          basicSalary: Number(employee.basicSalary),
          housingAllowance: Number(employee.housingAllowance),
          transportAllowance: Number(employee.transportAllowance),
          otherAllowances: Number(employee.otherAllowances),
          otherDeductions: 0,
          includeRama: employee.ramaEnabled,
        },
        {
          payeEnabled: config.payeEnabled,
          rssbPensionEmployee: Number(config.rssbPensionEmployee),
          rssbPensionEmployer: Number(config.rssbPensionEmployer),
          rssbMedical: Number(config.rssbMedical),
          cbhiRate: Number(config.cbhiRate),
          maternityLevy: Number(config.maternityLevy),
          occupationalHazardRate: Number(config.occupationalHazardRate ?? 0.02),
        },
      );

      const { employeeDeductions: _ed, employerCosts: _ec, ...recordFields } = result;

      await this.prisma.payrollRecord.upsert({
        where: { periodId_employeeId: { periodId: period.id, employeeId: employee.id } },
        create: { tenantId, periodId: period.id, employeeId: employee.id, ...recordFields },
        update: recordFields,
      });
    }

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'RUN_PAYROLL',
      resource: 'payroll_periods',
      resourceId: periodId,
      payload: { periodMonth: period.periodMonth, periodYear: period.periodYear },
    });

    return this.findOne(tenantId, periodId);
  }

  async submit(tenantId: string, periodId: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: { _count: { select: { records: true } } },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status !== 'DRAFT') throw new BadRequestException('Only draft periods can be submitted');
    if (period._count.records < 1) throw new BadRequestException('No payroll records found for this period');

    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'SUBMIT_PAYROLL',
      resource: 'payroll_periods',
      resourceId: periodId,
      payload: { periodMonth: updated.periodMonth, periodYear: updated.periodYear },
    });

    void notifyTenantRoles(tenantId, ['HR_MANAGER'], 'payroll-submitted', {
      periodId: updated.id,
      clientId: updated.clientId,
      periodMonth: updated.periodMonth,
      periodYear: updated.periodYear,
      stage: 'HR review',
    });
    return updated;
  }

  async approve(tenantId: string, periodId: string, userId: string, roles: string[], dto: ApprovePeriodDto) {
    const period = await this.prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    let statusUpdate: Record<string, unknown> = {};
    let approverRole: 'HR_MANAGER' | 'MD' | 'CLIENT_ADMIN';
    let notifyType = '';
    let notifyRoles: string[] = [];

    if (period.status === 'SUBMITTED' && roles.includes('HR_MANAGER')) {
      statusUpdate = { status: 'HR_APPROVED', hrApprovedAt: new Date(), hrApprovedBy: userId };
      approverRole = 'HR_MANAGER';
      notifyType = 'payroll-hr-approved';
      notifyRoles = ['MANAGING_DIRECTOR', 'TENANT_ADMIN'];
    } else if (
      period.status === 'HR_APPROVED' &&
      (roles.includes('MANAGING_DIRECTOR') || roles.includes('TENANT_ADMIN'))
    ) {
      statusUpdate = { status: 'MD_APPROVED', mdApprovedAt: new Date(), mdApprovedBy: userId };
      approverRole = 'MD';
      notifyType = 'payroll-md-approved';
      if (period.clientId === 'default') {
        notifyRoles = ['FINANCE_OFFICER', 'TENANT_ADMIN'];
      } else {
        notifyRoles = ['CLIENT_ADMIN'];
      }
    } else if (period.status === 'MD_APPROVED' && roles.includes('CLIENT_ADMIN')) {
      statusUpdate = { status: 'CLIENT_APPROVED', clientApprovedAt: new Date(), clientApprovedBy: userId };
      approverRole = 'CLIENT_ADMIN';
      notifyType = 'payroll-client-approved';
      notifyRoles = ['FINANCE_OFFICER', 'TENANT_ADMIN'];
    } else {
      throw new ForbiddenException('Invalid approval role for current period status');
    }

    const updated = await this.prisma.payrollPeriod.update({ where: { id: periodId }, data: statusUpdate });
    await this.prisma.payrollApproval.create({
      data: {
        tenantId,
        periodId,
        approverRole,
        approverId: userId,
        action: 'APPROVED',
        comments: dto.comments,
      },
    });
    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'APPROVE_PAYROLL',
      resource: 'payroll_periods',
      resourceId: periodId,
      payload: { periodMonth: updated.periodMonth, periodYear: updated.periodYear, action: 'APPROVED', approverRole },
    });
    void notifyTenantRoles(tenantId, notifyRoles, notifyType, {
      periodId,
      periodMonth: updated.periodMonth,
      periodYear: updated.periodYear,
      clientId: updated.clientId,
      comments: dto.comments,
      stage: approverRole,
    });
    return updated;
  }

  async reject(tenantId: string, periodId: string, userId: string, roles: string[], dto: ApprovePeriodDto) {
    const period = await this.prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    const canReject =
      (period.status === 'SUBMITTED' && roles.includes('HR_MANAGER')) ||
      (period.status === 'HR_APPROVED' &&
        (roles.includes('MANAGING_DIRECTOR') || roles.includes('TENANT_ADMIN'))) ||
      (period.status === 'MD_APPROVED' && roles.includes('CLIENT_ADMIN'));
    if (!canReject) {
      throw new ForbiddenException('User role cannot reject this period at the current stage');
    }
    if (!['SUBMITTED', 'HR_APPROVED', 'MD_APPROVED', 'CLIENT_APPROVED'].includes(period.status)) {
      throw new BadRequestException('Period cannot be rejected at this stage');
    }
    const role =
      period.status === 'SUBMITTED'
        ? 'HR_MANAGER'
        : period.status === 'HR_APPROVED'
          ? 'MD'
          : 'CLIENT_ADMIN';
    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'DRAFT' },
    });
    await this.prisma.payrollApproval.create({
      data: {
        tenantId,
        periodId,
        approverRole: role,
        approverId: userId,
        action: 'REJECTED',
        comments: dto.comments,
      },
    });
    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'REJECT_PAYROLL',
      resource: 'payroll_periods',
      resourceId: periodId,
      payload: { periodMonth: updated.periodMonth, periodYear: updated.periodYear, action: 'REJECTED', rejecterRole: role },
    });
    void notifyTenantRoles(tenantId, ['FINANCE_OFFICER', 'TENANT_ADMIN'], 'payroll-rejected', {
      periodId,
      periodMonth: updated.periodMonth,
      periodYear: updated.periodYear,
      comments: dto.comments,
    });
    return updated;
  }

  async finalize(tenantId: string, periodId: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: { records: { include: { employee: true } } },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    const readyToFinalize =
      period.status === 'CLIENT_APPROVED' ||
      (period.status === 'MD_APPROVED' && period.clientId === 'default');
    if (!readyToFinalize) {
      throw new BadRequestException(
        'Period must be fully approved before finalize (client sign-off required for external clients)',
      );
    }
    const finalized = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });

    for (const record of period.records) {
      await this.payslipService.generateAndUploadPayslip(
        tenantId,
        record.id,
        periodId,
        {
          id: record.employee.id,
          firstName: record.employee.firstName,
          lastName: record.employee.lastName,
          jobTitle: record.employee.jobTitle,
          email: record.employee.email,
        },
        record,
        { periodMonth: period.periodMonth, periodYear: period.periodYear },
      );

      void dispatchNotification('payslip-ready', {
        employeeId: record.employeeId,
        employeeEmail: record.employee.email,
        periodId,
        tenantId,
      });
    }

    const totalAmount = period.records.reduce((sum, rec) => sum + Number(rec.netPay), 0);
    await this.prisma.bankPaymentFile.create({
      data: {
        tenantId,
        periodId,
        generatedBy: userId,
        totalAmount,
        recordCount: period.records.length,
      },
    });
    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'FINALIZE_PAYROLL',
      resource: 'payroll_periods',
      resourceId: periodId,
      payload: { periodMonth: finalized.periodMonth, periodYear: finalized.periodYear, recordCount: period.records.length, totalAmount },
    });
    void dispatchNotification('payroll-finalized', {
      periodId,
      tenantId,
      recordCount: period.records.length,
    });
    return finalized;
  }
}
