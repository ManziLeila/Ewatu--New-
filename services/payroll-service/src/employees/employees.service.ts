import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, COMPENSATION_FIELDS, maskFieldsList, maskFields, can } from '@ewatu/common-auth';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EmploymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dtos/create-employee.dto';
import { CreateEmployeeFromPlacementDto } from './dtos/create-employee-from-placement.dto';
import { UpdateEmployeeDto } from './dtos/update-employee.dto';

export type BulkImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  phone?: string;
  department?: string;
  clientId?: string;
  basicSalary?: number;
  rssbNumber?: string;
  ramaEnabled?: boolean;
};

export type BulkImportResult = {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return tenantId;
  }

  private getEncryptionKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
      throw new ForbiddenException('ENCRYPTION_KEY not configured');
    }
    return Buffer.from(hex, 'hex');
  }

  private encrypt(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(stored: string): string {
    const [ivHex, cipherHex] = stored.split(':');
    if (!ivHex || !cipherHex) return '';
    const key = this.getEncryptionKey();
    const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private sanitizeEmployee<T extends Record<string, unknown>>(employee: T) {
    const { nationalIdEncrypted: _nationalIdEncrypted, bankAccountEncrypted: _bankAccountEncrypted, ...rest } =
      employee;
    return rest;
  }

  private enrichDetail<T extends { nationalIdEncrypted?: string | null; bankAccountEncrypted?: string | null }>(
    employee: T,
  ) {
    const sanitized = this.sanitizeEmployee(employee as Record<string, unknown>);
    return {
      ...sanitized,
      ...(employee.nationalIdEncrypted
        ? { nationalId: this.decrypt(employee.nationalIdEncrypted) }
        : {}),
      ...(employee.bankAccountEncrypted
        ? { bankAccount: this.decrypt(employee.bankAccountEncrypted) }
        : {}),
    };
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const nationalIdEncrypted = dto.nationalId ? this.encrypt(dto.nationalId) : undefined;
    const bankAccountEncrypted = dto.bankAccount ? this.encrypt(dto.bankAccount) : undefined;
    const { nationalId: _nationalId, bankAccount: _bankAccount, ...rest } = dto;

    const created = await this.prisma.employee.create({
      data: {
        tenantId,
        ...rest,
        employeeType: dto.employeeType ?? 'OUTSOURCED',
        basicSalary: dto.basicSalary ?? 0,
        housingAllowance: dto.housingAllowance ?? 0,
        transportAllowance: dto.transportAllowance ?? 0,
        otherAllowances: dto.otherAllowances ?? 0,
        ramaEnabled: dto.ramaEnabled ?? true,
        rssbNumber: dto.rssbNumber?.trim() || undefined,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        nationalIdEncrypted,
        bankAccountEncrypted,
      },
    });

    return this.sanitizeEmployee(created);
  }

  async findAll(tenantId: string, query: Record<string, string | undefined>, callerPermissions?: string[]) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
    const search = query.search?.trim();
    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.employeeType ? { employeeType: query.employeeType as any } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus as any } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contracts: { orderBy: { startDate: 'desc' }, take: 1 },
          _count: { select: { payrollRecords: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    const sanitized = items.map((item) => this.sanitizeEmployee(item));
    return {
      data: maskFieldsList(sanitized, COMPENSATION_FIELDS, { permissions: callerPermissions }, 'employee-compensation'),
      page,
      limit,
      total,
    };
  }

  private async resolveMyEmployeeOrThrow(tenantId: string, email: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    });
    if (!employee) throw new NotFoundException('No employee record is linked to this account');
    return employee;
  }

  /** Self-service lookup: find the employee record linked to the caller's own account email. */
  async findMyRecord(tenantId: string, email: string) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    return this.sanitizeEmployee(employee);
  }

  /** Like findMyRecord, but decrypted — for the caller's own profile screen, where they should
   *  be able to see (and edit) what's on file for their own bank details. */
  async getMyProfile(tenantId: string, email: string) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    return this.enrichDetail(employee);
  }

  /** Only the safe subset of fields an employee may edit about themselves — job title, salary,
   *  employment status, manager, department, etc. stay HR/admin-only via the regular update(). */
  async updateMyProfile(
    tenantId: string,
    email: string,
    dto: {
      phone?: string;
      bankAccount?: string;
      bankName?: string;
      bankBranch?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    },
  ) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    const bankAccountEncrypted = dto.bankAccount ? this.encrypt(dto.bankAccount) : undefined;

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
        ...(dto.bankBranch !== undefined ? { bankBranch: dto.bankBranch } : {}),
        ...(dto.emergencyContactName !== undefined ? { emergencyContactName: dto.emergencyContactName } : {}),
        ...(dto.emergencyContactPhone !== undefined ? { emergencyContactPhone: dto.emergencyContactPhone } : {}),
        ...(bankAccountEncrypted ? { bankAccountEncrypted } : {}),
      },
    });
    return this.enrichDetail(updated);
  }

  /** The bucket is private, so a bare bucket URL 403s — every download link needs a
   *  short-lived signed GET URL from document-service instead. */
  private async buildDocumentUrl(s3Key: string): Promise<string | null> {
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

  private async requestDocumentPresign(
    tenantId: string,
    objectKey: string,
    contentType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; key: string }> {
    const base = (process.env.DOCUMENT_SERVICE_URL ?? 'http://document-service:3018').replace(/\/$/, '');
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new ForbiddenException('Document service not configured');

    const response = await fetch(`${base}/api/v1/document/internal/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ tenantId, objectKey, contentType, fileSize }),
    });
    if (!response.ok) {
      throw new ForbiddenException('Failed to obtain upload URL from document service');
    }
    const body = (await response.json()) as { data?: { uploadUrl: string; key: string } };
    if (!body.data?.uploadUrl || !body.data?.key) {
      throw new ForbiddenException('Document service returned an unexpected response');
    }
    return body.data;
  }

  async listMyDocuments(tenantId: string, email: string) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    const docs = await this.prisma.employeeDocument.findMany({
      where: { tenantId, employeeId: employee.id },
      orderBy: { uploadedAt: 'desc' },
    });
    return Promise.all(docs.map(async (d) => ({ ...d, downloadUrl: await this.buildDocumentUrl(d.s3Key) })));
  }

  async requestMyDocumentUpload(
    tenantId: string,
    email: string,
    body: { name: string; contentType: string; fileSize: number; expiryDate?: string },
  ) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    const objectKey = `employees/${employee.id}/documents/${Date.now()}-${body.name}`;
    const presign = await this.requestDocumentPresign(tenantId, objectKey, body.contentType, body.fileSize);
    const document = await this.prisma.employeeDocument.create({
      data: {
        tenantId,
        employeeId: employee.id,
        name: body.name,
        s3Key: presign.key,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      },
    });
    return { uploadUrl: presign.uploadUrl, document };
  }

  async deleteMyDocument(tenantId: string, email: string, documentId: string) {
    const employee = await this.resolveMyEmployeeOrThrow(tenantId, email);
    const doc = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, tenantId, employeeId: employee.id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.employeeDocument.delete({ where: { id: documentId } });
  }

  /** Staff-safe colleague listing — name, job title, department, work contact only. No salary,
   *  bank details, national ID, or employment-status/manager-chain data. Open to any
   *  authenticated tenant user, unlike the full findAll() (HR/admin only). */
  async getDirectory(tenantId: string, search?: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        employmentStatus: 'ACTIVE',
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
        email: true,
        phone: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return employees;
  }

  async findOne(tenantId: string, id: string, callerPermissions?: string[]) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        contracts: { orderBy: { startDate: 'desc' } },
        payrollRecords: {
          orderBy: [{ period: { periodYear: 'desc' } }, { period: { periodMonth: 'desc' } }],
          take: 3,
          include: { period: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const detail = this.enrichDetail(employee);
    const caller = { permissions: callerPermissions };
    const masked = maskFields(detail, COMPENSATION_FIELDS, caller, 'employee-compensation');
    // payrollRecords carry their own gross/net figures — same confidentiality tier as
    // basicSalary/allowances, so the whole list is withheld alongside them rather than
    // masked record-by-record.
    if (!can(caller, 'read', 'employee-compensation')) {
      return { ...masked, payrollRecords: [] };
    }
    return masked;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    const nationalIdEncrypted = dto.nationalId ? this.encrypt(dto.nationalId) : undefined;
    const bankAccountEncrypted = dto.bankAccount ? this.encrypt(dto.bankAccount) : undefined;
    const { nationalId: _nationalId, bankAccount: _bankAccount, ...rest } = dto;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.rssbNumber !== undefined ? { rssbNumber: dto.rssbNumber.trim() || null } : {}),
        ...(dto.ramaEnabled !== undefined ? { ramaEnabled: dto.ramaEnabled } : {}),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        ...(nationalIdEncrypted ? { nationalIdEncrypted } : {}),
        ...(bankAccountEncrypted ? { bankAccountEncrypted } : {}),
      },
    });
    return this.enrichDetail(updated);
  }

  async terminate(tenantId: string, id: string) {
    const existing = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id },
      data: { employmentStatus: EmploymentStatus.TERMINATED, endDate: new Date() },
    });
  }

  async createFromPlacement(user: AuthUser, dto: CreateEmployeeFromPlacementDto) {
    const tenantId = this.requireTenant(user.tenant_id);
    const lookupId = dto.candidateId ?? dto.placementId;
    const duplicate = lookupId
      ? await this.prisma.employee.findFirst({ where: { tenantId, candidateId: lookupId } })
      : null;
    if (duplicate) throw new ConflictException('Employee already exists for this candidate');
    return this.create(tenantId, {
      ...dto,
      clientId: dto.clientId ?? dto.placementId,
      candidateId: lookupId,
      employeeType: dto.employeeType ?? 'OUTSOURCED',
      jobTitle: dto.jobTitle ?? 'Employee',
      startDate: dto.startDate ?? new Date().toISOString(),
    });
  }

  async bulkImport(tenantId: string, rows: BulkImportRow[]): Promise<BulkImportResult> {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row: BulkImportRow | undefined = rows[i];
      const rowNumber = i + 1;

      if (!row || !row.firstName || !row.lastName || !row.email || !row.jobTitle || !row.startDate) {
        errors.push({
          row: rowNumber,
          error: 'Missing required fields: firstName, lastName, email, jobTitle, startDate',
        });
        continue;
      }

      const email = row.email.toLowerCase().trim();

      try {
        const existing = await this.prisma.employee.findFirst({ where: { tenantId, email } });
        if (existing) {
          skipped++;
          continue;
        }

        if (Number.isNaN(new Date(row.startDate).getTime())) {
          errors.push({ row: rowNumber, error: `Invalid startDate: ${row.startDate}` });
          continue;
        }

        await this.create(tenantId, {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email,
          jobTitle: row.jobTitle.trim(),
          startDate: row.startDate,
          phone: row.phone?.trim() || undefined,
          department: row.department?.trim() || undefined,
          clientId: row.clientId?.trim() || undefined,
          basicSalary: row.basicSalary != null && !Number.isNaN(Number(row.basicSalary))
            ? Number(row.basicSalary)
            : undefined,
          rssbNumber: row.rssbNumber?.trim() || undefined,
          ramaEnabled: row.ramaEnabled ?? true,
        });

        created++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({ row: rowNumber, error: message });
      }
    }

    return { created, skipped, errors };
  }

  async convertFromPlacement(
    tenantId: string,
    id: string,
    body: { placementId?: string; candidateData?: Record<string, string | undefined> },
  ) {
    const existing = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.update(tenantId, id, {
      clientId: body.placementId ?? existing.clientId ?? undefined,
      firstName: body.candidateData?.firstName ?? existing.firstName,
      lastName: body.candidateData?.lastName ?? existing.lastName,
      email: body.candidateData?.email ?? existing.email,
      phone: body.candidateData?.phone ?? existing.phone ?? undefined,
    });
  }
}
