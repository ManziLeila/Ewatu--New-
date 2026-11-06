import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { TenantPurgeOrchestrator } from './tenant-purge.orchestrator';

@Injectable()
export class TenantService {
  private readonly log = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly purgeOrchestrator: TenantPurgeOrchestrator,
  ) {}

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  async updateSettings(tenantId: string, data: {
    name?: string;
    logoUrl?: string;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    website?: string;
    baseCurrency?: string;
    fiscalYearStartMonth?: number;
  }) {
    try {
      return await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
          ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor } : {}),
          ...(data.secondaryColor !== undefined ? { secondaryColor: data.secondaryColor } : {}),
          ...(data.accentColor !== undefined ? { accentColor: data.accentColor } : {}),
          ...(data.backgroundColor !== undefined ? { backgroundColor: data.backgroundColor } : {}),
          ...(data.textColor !== undefined ? { textColor: data.textColor } : {}),
          ...(data.website !== undefined ? { website: data.website || null } : {}),
          ...(data.baseCurrency !== undefined ? { baseCurrency: data.baseCurrency } : {}),
          ...(data.fiscalYearStartMonth !== undefined
            ? { fiscalYearStartMonth: data.fiscalYearStartMonth }
            : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Tenant not found');
      }
      throw e;
    }
  }

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findPending() {
    return this.prisma.tenant.findMany({
      where: { status: 'PENDING_ACTIVATION' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status !== 'PENDING_ACTIVATION') {
      throw new BadRequestException('Only PENDING_ACTIVATION tenants can be approved');
    }
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE', rejectionReason: null },
    });
    const webOrigin = process.env.WEB_APP_ORIGIN?.replace(/\/$/, '') ?? 'http://localhost:5173';
    await this.notify.dispatch({
      channel: 'both',
      to: t.businessEmail ?? undefined,
      userId: t.ownerUserId ?? undefined,
      tenantId: t.id,
      template: 'tenant-approved',
      payload: { companyName: t.name, loginUrl: `${webOrigin}/login` },
      title: 'Company approved',
      body: `Your workspace for ${t.name} is now active.`,
    });
    return updated;
  }

  async reject(id: string, reason?: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status !== 'PENDING_ACTIVATION') {
      throw new BadRequestException('Only PENDING_ACTIVATION tenants can be rejected');
    }
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason?.trim() || null },
    });
    await this.notify.dispatch({
      channel: 'both',
      to: t.businessEmail ?? undefined,
      userId: t.ownerUserId ?? undefined,
      tenantId: t.id,
      template: 'tenant-rejected',
      payload: {
        companyName: t.name,
        reason: reason?.trim() || '',
      },
      title: 'Registration update',
      body: `Your registration for ${t.name} was not approved.`,
    });
    return updated;
  }

  /** Blocks new logins for an otherwise-active company. Already-issued JWTs stay valid until
   *  they naturally expire/refresh — tenant_status is baked into the token, not re-checked live. */
  async suspend(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status !== 'ACTIVE' && t.status !== 'TRIAL') {
      throw new BadRequestException('Only an ACTIVE or TRIAL tenant can be suspended');
    }
    return this.prisma.tenant.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  /** Reverses a suspension. Does not apply to PENDING_ACTIVATION (use approve) or ARCHIVED
   *  (archiving is treated as a harder, one-way action in this pass). */
  async reactivate(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status !== 'SUSPENDED') {
      throw new BadRequestException('Only a SUSPENDED tenant can be reactivated');
    }
    return this.prisma.tenant.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  /** Soft "delete": no other service cascades on tenantId (it's a loose reference everywhere,
   *  not a foreign key), so a real hard delete would silently orphan that company's users,
   *  employees, payroll and leave history in every other service. Archiving blocks all further
   *  access via TenantStatusGuard while leaving every service's data intact and recoverable. */
  async archive(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status === 'ARCHIVED') {
      throw new BadRequestException('Tenant is already archived');
    }
    return this.prisma.tenant.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  /** Hard delete: purges tenant data in every service, then removes the platform tenant row. */
  async purgePermanent(id: string, confirmSlug: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.slug !== confirmSlug.trim().toLowerCase()) {
      throw new BadRequestException('Confirmation slug does not match this company');
    }
    if (t.status !== 'ARCHIVED' && t.status !== 'REJECTED') {
      throw new BadRequestException(
        'Archive or reject the company before permanent delete',
      );
    }
    const services = await this.purgeOrchestrator.purgeAllServices(id);
    await this.prisma.tenant.delete({ where: { id } });
    this.log.warn(`Permanently purged tenant ${t.slug} (${id})`);
    return { id, slug: t.slug, purged: true, services };
  }

  async markOwnerEmailVerified(tenantId: string) {
    try {
      return await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { emailVerifiedAt: new Date() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException();
      }
      throw e;
    }
  }

  async updateAdmin(id: string, dto: UpdateTenantDto) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    if (t.status === 'ARCHIVED') {
      throw new BadRequestException('Archived tenants cannot be edited');
    }
    if (!dto.name && !dto.plan && !dto.country) {
      throw new BadRequestException('Nothing to update');
    }
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.plan !== undefined ? { plan: dto.plan } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Tenant not found');
      }
      throw e;
    }
  }

  async create(dto: CreateTenantDto) {
    try {
      return await this.prisma.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          plan: dto.plan ?? null,
          country: dto.country?.toUpperCase() ?? 'RW',
          status: (dto.status as TenantStatus | undefined) ?? TenantStatus.ACTIVE,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `A tenant with slug "${dto.slug}" already exists`,
        );
      }
      throw e;
    }
  }
}
