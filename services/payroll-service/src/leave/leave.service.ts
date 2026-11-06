import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { COMPENSATION_FIELDS, maskFields } from '@ewatu/common-auth';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { dispatchNotification } from '../common/notification.dispatch';
import { notifyTenantRoles } from '../common/payroll-notify';

/** Strips salary/allowance fields from an embedded Employee unless the caller holds
 *  employee-compensation:read — leave approval never needs to expose pay figures. */
function maskEmployeeCompensation<T extends { employee: Record<string, unknown> }>(
  requestLike: T,
  caller: { permissions?: string[] },
): T {
  return { ...requestLike, employee: maskFields(requestLike.employee, COMPENSATION_FIELDS, caller, 'employee-compensation') };
}

const MANAGER_ROLES = ['TENANT_ADMIN', 'HR_MANAGER'];
const SENIOR_ROLES = ['TENANT_ADMIN', 'HR_MANAGER', 'MANAGING_DIRECTOR'];

// Ported from web/src/pages/leave/publicHolidays.ts so the seeded backend data matches what
// the frontend previously hardcoded. Movable religious holidays are intentionally excluded.
const RWANDA_DEFAULT_HOLIDAYS = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Heroes' Day", month: 2, day: 1 },
  { name: 'Genocide against the Tutsi Memorial Day', month: 4, day: 7 },
  { name: 'Labour Day', month: 5, day: 1 },
  { name: 'Independence Day', month: 7, day: 1 },
  { name: 'Liberation Day', month: 7, day: 4 },
  { name: 'Umuganura Day', month: 8, day: 1, note: 'First Friday of August' },
  { name: 'Assumption Day', month: 8, day: 15 },
  { name: 'Christmas Day', month: 12, day: 25 },
  { name: 'Boxing Day', month: 12, day: 26 },
];

@Injectable()
export class LeaveService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async onModuleInit() {
    // Standard initialization if needed, but we seed defaults per tenant demand
  }

  // Ensures standard leave types exist for a tenant
  async ensureDefaultLeaveTypes(tenantId: string): Promise<void> {
    const defaults = [
      { name: 'Annual Leave', code: 'ANNUAL', defaultDays: 22 },
      { name: 'Sick Leave', code: 'SICK', defaultDays: 10 },
      { name: 'Maternity Leave', code: 'MATERNITY', defaultDays: 90 },
      { name: 'Paternity Leave', code: 'PATERNITY', defaultDays: 4 },
      { name: 'Compassionate Leave', code: 'COMPASSIONATE', defaultDays: 5 },
      { name: 'Study Leave', code: 'STUDY', defaultDays: 10 },
      { name: 'Unpaid Leave', code: 'UNPAID', defaultDays: 0 },
    ];

    for (const d of defaults) {
      const exists = await this.prisma.leaveType.findFirst({
        where: { tenantId, code: d.code },
      });
      if (!exists) {
        await this.prisma.leaveType.create({
          data: {
            tenantId,
            name: d.name,
            code: d.code,
            defaultDays: d.defaultDays,
          },
        });
      }
    }
  }

  async getLeaveTypes(tenantId: string) {
    await this.ensureDefaultLeaveTypes(tenantId);
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  /** Team ids where this employee holds the LEAD role. */
  private async getLedTeamIds(tenantId: string, employeeId: string): Promise<string[]> {
    const led = await this.prisma.teamMember.findMany({
      where: { tenantId, employeeId, role: 'LEAD' },
      select: { teamId: true },
    });
    return led.map((l) => l.teamId);
  }

  /** Every employee who belongs to any of the given teams (any role), de-duplicated. */
  private async getTeamsMemberEmployeeIds(tenantId: string, teamIds: string[]): Promise<string[]> {
    if (!teamIds.length) return [];
    const members = await this.prisma.teamMember.findMany({
      where: { tenantId, teamId: { in: teamIds } },
      select: { employeeId: true },
    });
    return [...new Set(members.map((m) => m.employeeId))];
  }

  /** Self, a senior officer, or a lead of a team the target belongs to may view someone's leave
   *  data. Throws otherwise. */
  private async assertCanViewEmployeeLeaveData(
    tenantId: string,
    targetEmployeeId: string,
    caller: { email?: string; roles: string[] },
  ): Promise<void> {
    if (SENIOR_ROLES.some((r) => caller.roles.includes(r))) return;

    const me = await this.findEmployeeForUser(tenantId, caller.email);
    if (me?.id === targetEmployeeId) return;

    if (me) {
      const ledTeamIds = await this.getLedTeamIds(tenantId, me.id);
      const ledMemberIds = await this.getTeamsMemberEmployeeIds(tenantId, ledTeamIds);
      if (ledMemberIds.includes(targetEmployeeId)) return;
    }

    throw new ForbiddenException('You are not authorized to view this employee\'s leave data');
  }

  async getLeaveBalances(
    tenantId: string,
    employeeId: string,
    year: number,
    caller: { email?: string; roles: string[]; permissions?: string[] },
  ) {
    await this.assertCanViewEmployeeLeaveData(tenantId, employeeId, caller);
    // Ensure balances exist for all types
    const types = await this.getLeaveTypes(tenantId);
    const balances = [];
    for (const type of types) {
      const balance = await this.getOrInitializeBalance(tenantId, employeeId, type.id, year);
      balances.push({
        ...balance,
        leaveType: type,
      });
    }
    return balances;
  }

  async getOrInitializeBalance(tenantId: string, employeeId: string, leaveTypeId: string, year: number) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });
    if (balance) return balance;

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    return this.prisma.leaveBalance.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        year,
        allocatedDays: leaveType.defaultDays,
        usedDays: 0,
      },
    });
  }

  /** Resolves the JWT caller to their linked Employee record, matching by email (same approach the frontend already uses). */
  async findEmployeeForUser(tenantId: string, email?: string) {
    if (!email) return null;
    return this.prisma.employee.findFirst({
      where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    });
  }

  /** Applicant (or HR senior applying on behalf) may edit/cancel only while status is PENDING. */
  private async assertCanModifyOwnPendingLeave(
    tenantId: string,
    request: { employeeId: string; status: string },
    actor: { email?: string; roles: string[] },
  ): Promise<void> {
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave requests can be edited or cancelled');
    }
    if (SENIOR_ROLES.some((r) => actor.roles.includes(r))) return;

    const me = await this.findEmployeeForUser(tenantId, actor.email);
    if (!me || me.id !== request.employeeId) {
      throw new ForbiddenException('You can only change your own leave requests');
    }
  }

  private async assertNoLeaveOverlap(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string,
  ): Promise<void> {
    const overlapping = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeRequestId ? { NOT: { id: excludeRequestId } } : {}),
      },
    });
    const conflict = overlapping[0];
    if (conflict) {
      throw new BadRequestException(
        `This overlaps an existing leave request from ${conflict.startDate.toDateString()} to ${conflict.endDate.toDateString()}.`,
      );
    }
  }

  private async assertCanActOnRequest(
    tenantId: string,
    request: { employeeId: string; employee: { managerId: string | null } },
    caller: { userId: string; roles: string[]; email?: string },
  ): Promise<void> {
    if (MANAGER_ROLES.some((r) => caller.roles.includes(r))) return;

    const callerEmployee = await this.findEmployeeForUser(tenantId, caller.email);
    if (callerEmployee && request.employee.managerId === callerEmployee.id) return;

    throw new ForbiddenException('You are not authorized to act on this leave request');
  }

  async createLeaveRequest(
    tenantId: string,
    body: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days?: number;
      reason?: string;
      attachmentS3Key?: string;
      delegateToEmployeeId?: string;
      emergencyContactPhone?: string;
    },
    actor: { userId: string; email?: string; roles: string[]; ip?: string },
  ) {
    if (!SENIOR_ROLES.some((r) => actor.roles.includes(r))) {
      const me = await this.findEmployeeForUser(tenantId, actor.email);
      if (!me || me.id !== body.employeeId) {
        throw new ForbiddenException('You can only submit a leave request for yourself');
      }
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const calculatedDays = body.days ?? this.calculateWorkingDays(startDate, endDate);
    const year = startDate.getFullYear();

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: body.leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    await this.assertNoLeaveOverlap(body.employeeId, startDate, endDate);

    // Check balance if not Unpaid Leave
    if (leaveType.code !== 'UNPAID') {
      const balance = await this.getOrInitializeBalance(tenantId, body.employeeId, body.leaveTypeId, year);
      const remaining = Number(balance.allocatedDays) - Number(balance.usedDays);
      if (calculatedDays > remaining) {
        throw new BadRequestException(`Insufficient leave balance. Remaining: ${remaining} days, requested: ${calculatedDays} days.`);
      }
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        leaveTypeId: body.leaveTypeId,
        startDate,
        endDate,
        numberOfDays: calculatedDays,
        reason: body.reason,
        attachmentS3Key: body.attachmentS3Key,
        delegateToEmployeeId: body.delegateToEmployeeId,
        emergencyContactPhone: body.emergencyContactPhone,
        status: 'PENDING',
      },
      include: {
        leaveType: true,
        employee: true,
      },
    });

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'SUBMITTED',
      resource: 'leave_request',
      resourceId: request.id,
      payload: { leaveType: leaveType.code, startDate: body.startDate, endDate: body.endDate },
      ipAddress: actor.ip,
    });
    void notifyTenantRoles(tenantId, ['HR_MANAGER', 'TENANT_ADMIN'], 'leave-submitted', {
      leaveRequestId: request.id,
      employeeId: request.employeeId,
      employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
      employeeEmail: request.employee.email,
      leaveType: leaveType.name,
    });

    return request;
  }

  async getLeaveRequestById(
    tenantId: string,
    id: string,
    caller: { email?: string; roles: string[]; permissions?: string[] },
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: true,
        delegateTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanViewEmployeeLeaveData(tenantId, request.employeeId, caller);
    const attachmentUrl = await this.buildAttachmentUrl(request.attachmentS3Key);
    return maskEmployeeCompensation({ ...request, attachmentUrl }, caller);
  }

  async updateLeaveRequest(
    tenantId: string,
    id: string,
    body: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days?: number;
      reason?: string;
      delegateToEmployeeId?: string;
      emergencyContactPhone?: string;
    },
    actor: { userId: string; email?: string; roles: string[]; ip?: string },
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanModifyOwnPendingLeave(tenantId, existing, actor);

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const calculatedDays = body.days ?? this.calculateWorkingDays(startDate, endDate);
    const year = startDate.getFullYear();

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: body.leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    await this.assertNoLeaveOverlap(existing.employeeId, startDate, endDate, id);

    if (leaveType.code !== 'UNPAID') {
      const balance = await this.getOrInitializeBalance(tenantId, existing.employeeId, body.leaveTypeId, year);
      const remaining = Number(balance.allocatedDays) - Number(balance.usedDays);
      if (calculatedDays > remaining) {
        throw new BadRequestException(
          `Insufficient leave balance. Remaining: ${remaining} days, requested: ${calculatedDays} days.`,
        );
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveTypeId: body.leaveTypeId,
        startDate,
        endDate,
        numberOfDays: calculatedDays,
        reason: body.reason,
        delegateToEmployeeId: body.delegateToEmployeeId || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        rejectionReason: null,
      },
      include: { leaveType: true, employee: true },
    });

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'UPDATED',
      resource: 'leave_request',
      resourceId: id,
      payload: { leaveType: leaveType.code, startDate: body.startDate, endDate: body.endDate },
      ipAddress: actor.ip,
    });

    return updated;
  }

  async cancelLeaveRequest(
    tenantId: string,
    id: string,
    reason: string,
    actor: { userId: string; email?: string; roles: string[]; ip?: string },
  ) {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException('A cancellation reason is required');
    }

    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanModifyOwnPendingLeave(tenantId, existing, actor);

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        rejectionReason: trimmed,
      },
      include: { leaveType: true, employee: true },
    });

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'CANCELLED',
      resource: 'leave_request',
      resourceId: id,
      payload: { reason: trimmed },
      ipAddress: actor.ip,
    });

    return updated;
  }

  /** `filters.employeeId` set: caller must be that employee, a senior officer, or lead a team
   *  the employee belongs to (checked via assertCanViewEmployeeLeaveData). No employeeId (a
   *  broad/list query, e.g. the HR approvals queue): senior officers see everyone; a team lead
   *  is scoped to their teams' members; anyone else gets an empty list rather than an error,
   *  matching the KPI module's `forReview` scoping convention. */
  async getLeaveRequests(
    tenantId: string,
    filters: {
      status?: string;
      employeeId?: string;
      department?: string;
      leaveTypeId?: string;
      managerId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    } = {},
    caller: { email?: string; roles: string[]; permissions?: string[] },
  ) {
    const isSeniorOfficer = SENIOR_ROLES.some((r) => caller.roles.includes(r));
    let scopedEmployeeIds: string[] | undefined;

    if (filters.employeeId) {
      await this.assertCanViewEmployeeLeaveData(tenantId, filters.employeeId, caller);
    } else if (!isSeniorOfficer) {
      const me = await this.findEmployeeForUser(tenantId, caller.email);
      const ledTeamIds = me ? await this.getLedTeamIds(tenantId, me.id) : [];
      scopedEmployeeIds = await this.getTeamsMemberEmployeeIds(tenantId, ledTeamIds);
      if (scopedEmployeeIds.length === 0) return [];
    }

    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    else if (scopedEmployeeIds) where.employeeId = { in: scopedEmployeeIds };
    if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
    if (filters.startDate) where.startDate = { ...(where.startDate ?? {}), gte: new Date(filters.startDate) };
    if (filters.endDate) where.endDate = { ...(where.endDate ?? {}), lte: new Date(filters.endDate) };

    const employeeFilter: any = {};
    if (filters.department) employeeFilter.department = filters.department;
    if (filters.managerId) employeeFilter.managerId = filters.managerId;
    if (filters.search) {
      employeeFilter.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: true,
        delegateTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const withAttachments = await Promise.all(
      requests.map(async (r) => ({ ...r, attachmentUrl: await this.buildAttachmentUrl(r.attachmentS3Key) })),
    );
    return withAttachments.map((r) => maskEmployeeCompensation(r, caller));
  }

  /** The bucket is private, so a bare bucket URL 403s — every download link needs a
   *  short-lived signed GET URL from document-service instead. */
  private async buildAttachmentUrl(s3Key: string | null): Promise<string | null> {
    if (!s3Key) return null;
    const base = (process.env.DOCUMENT_SERVICE_URL ?? 'http://document-service:3018').replace(/\/$/, '');
    const key = process.env.INTERNAL_API_KEY;
    if (!key) return null;

    try {
      const response = await fetch(`${base}/api/v1/document/internal/presign-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': key },
        body: JSON.stringify({ key: s3Key }),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { data?: { downloadUrl: string } };
      return body.data?.downloadUrl ?? null;
    } catch {
      return null;
    }
  }

  async approveLeaveRequest(
    tenantId: string,
    id: string,
    actor: { userId: string; roles: string[]; email?: string; permissions?: string[]; ip?: string },
    note?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanActOnRequest(tenantId, request, actor);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Leave request is already processed');
    }

    const year = request.startDate.getFullYear();

    // Deduct leave balance
    if (request.leaveType.code !== 'UNPAID') {
      const balance = await this.getOrInitializeBalance(
        tenantId,
        request.employeeId,
        request.leaveTypeId,
        year,
      );
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          usedDays: Number(balance.usedDays) + Number(request.numberOfDays),
        },
      });
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actor.userId,
        approvedAt: new Date(),
        reason: note ? `${request.reason ?? ''} (Note: ${note})` : request.reason,
      },
      include: {
        leaveType: true,
        employee: true,
      },
    });

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'APPROVED',
      resource: 'leave_request',
      resourceId: id,
      payload: { comments: note },
      ipAddress: actor.ip,
    });
    void dispatchNotification('leave-approved', {
      tenantId,
      leaveRequestId: id,
      employeeId: updated.employeeId,
      employeeEmail: updated.employee.email,
      leaveType: updated.leaveType.name,
    });

    return maskEmployeeCompensation(updated, actor);
  }

  async rejectLeaveRequest(
    tenantId: string,
    id: string,
    actor: { userId: string; roles: string[]; email?: string; permissions?: string[]; ip?: string },
    note?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanActOnRequest(tenantId, request, actor);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Leave request is already processed');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: actor.userId,
        approvedAt: new Date(),
        rejectionReason: note,
      },
      include: {
        leaveType: true,
        employee: true,
      },
    });

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'REJECTED',
      resource: 'leave_request',
      resourceId: id,
      payload: { comments: note },
      ipAddress: actor.ip,
    });
    void dispatchNotification('leave-rejected', {
      tenantId,
      leaveRequestId: id,
      employeeId: updated.employeeId,
      employeeEmail: updated.employee.email,
      leaveType: updated.leaveType.name,
      reason: note,
    });

    return maskEmployeeCompensation(updated, actor);
  }

  async requestMoreInfo(
    tenantId: string,
    id: string,
    actor: { userId: string; roles: string[]; email?: string; permissions?: string[]; ip?: string },
    note: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found');
    }
    await this.assertCanActOnRequest(tenantId, request, actor);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Leave request is already processed');
    }
    if (!note?.trim()) {
      throw new BadRequestException('A note is required when requesting more information');
    }

    void this.auditLog.record({
      tenantId,
      userId: actor.userId,
      action: 'INFO_REQUESTED',
      resource: 'leave_request',
      resourceId: id,
      payload: { comments: note },
      ipAddress: actor.ip,
    });
    void dispatchNotification('leave-info-requested', {
      tenantId,
      leaveRequestId: id,
      employeeId: request.employeeId,
      employeeEmail: request.employee.email,
      note,
    });

    return { requested: true };
  }

  async uploadLeaveAttachment(
    tenantId: string,
    id: string,
    contentType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; objectKey: string }> {
    const request = await this.prisma.leaveRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Leave request not found');

    const extension = contentType.includes('/') ? contentType.split('/')[1] : 'bin';
    const objectKey = `leave/${request.id}/attachment-${Date.now()}.${extension}`;
    const presign = await this.requestPresign(tenantId, objectKey, contentType, fileSize);

    await this.prisma.leaveRequest.update({
      where: { id: request.id },
      data: { attachmentS3Key: presign.key },
    });

    return { uploadUrl: presign.uploadUrl, objectKey: presign.key };
  }

  private async requestPresign(
    tenantId: string,
    objectKey: string,
    contentType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; key: string }> {
    const base = (process.env.DOCUMENT_SERVICE_URL ?? 'http://document-service:3018').replace(/\/$/, '');
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new ServiceUnavailableException('Document service not configured');

    const response = await fetch(`${base}/api/v1/document/internal/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': key,
      },
      body: JSON.stringify({ tenantId, objectKey, contentType, fileSize }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Failed to obtain upload URL from document service');
    }

    const body = (await response.json()) as { data?: { uploadUrl: string; key: string } };
    if (!body.data?.uploadUrl || !body.data?.key) {
      throw new ServiceUnavailableException('Document service returned an unexpected response');
    }
    return body.data;
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    // Normalize time to avoid timezone issues
    curDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate.getTime());
    end.setHours(0, 0, 0, 0);

    while (curDate <= end) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  }

  // --- Holidays ---

  private nextOccurrence(h: { month: number; day: number }, from: Date): Date {
    const year = from.getFullYear();
    let date = new Date(year, h.month - 1, h.day);
    if (date < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
      date = new Date(year + 1, h.month - 1, h.day);
    }
    return date;
  }

  async ensureDefaultHolidays(tenantId: string): Promise<void> {
    const existing = await this.prisma.holiday.count({ where: { tenantId } });
    if (existing > 0) return;
    await this.prisma.holiday.createMany({
      data: RWANDA_DEFAULT_HOLIDAYS.map((h) => ({ tenantId, ...h })),
    });
  }

  /** Returns holidays sorted by next upcoming occurrence from `from` (default: now). */
  async listHolidays(tenantId: string, from: Date = new Date()) {
    await this.ensureDefaultHolidays(tenantId);
    const holidays = await this.prisma.holiday.findMany({ where: { tenantId } });
    return holidays
      .map((h) => ({ ...h, nextDate: this.nextOccurrence(h, from) }))
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }

  async createHoliday(tenantId: string, body: { name: string; month: number; day: number; note?: string }) {
    if (body.month < 1 || body.month > 12) throw new BadRequestException('month must be 1-12');
    if (body.day < 1 || body.day > 31) throw new BadRequestException('day must be 1-31');
    return this.prisma.holiday.create({ data: { tenantId, ...body } });
  }

  async updateHoliday(
    tenantId: string,
    id: string,
    body: Partial<{ name: string; month: number; day: number; note: string }>,
  ) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Holiday not found');
    return this.prisma.holiday.update({ where: { id }, data: body });
  }

  async deleteHoliday(tenantId: string, id: string) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Holiday not found');
    return this.prisma.holiday.delete({ where: { id } });
  }

  // --- Team "who's out" ---

  /** APPROVED leave requests, overlapping [start, end], for co-members of any team the caller
   *  belongs to (excluding the caller themselves). Returns an empty list for someone on no
   *  team, rather than falling back to a company-wide view — this is meant to be private by
   *  default, matching the "team calendar, not org calendar" scope of the employee dashboard. */
  async getTeamOut(tenantId: string, callerEmail: string | undefined, start: string, end: string) {
    const me = await this.findEmployeeForUser(tenantId, callerEmail);
    if (!me) return [];

    const memberships = await this.prisma.teamMember.findMany({
      where: { tenantId, employeeId: me.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    if (!teamIds.length) return [];

    const teammates = await this.prisma.teamMember.findMany({
      where: { tenantId, teamId: { in: teamIds }, employeeId: { not: me.id } },
      select: { employeeId: true },
    });
    const teammateIds = [...new Set(teammates.map((t) => t.employeeId))];
    if (!teammateIds.length) return [];

    return this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: teammateIds },
        status: 'APPROVED',
        startDate: { lte: new Date(end) },
        endDate: { gte: new Date(start) },
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }
}
