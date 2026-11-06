import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dispatchNotification } from '../common/notification.dispatch';
import type { CreatePlacementDto } from './dtos/create-placement.dto';

@Injectable()
export class PlacementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, filters?: { jobId?: string; candidateId?: string }) {
    return this.prisma.placement.findMany({
      where: {
        tenantId,
        ...(filters?.jobId ? { jobId: filters.jobId } : {}),
        ...(filters?.candidateId ? { candidateId: filters.candidateId } : {}),
      },
      include: {
        offer: {
          include: { application: { include: { candidate: true, job: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const placement = await this.prisma.placement.findUnique({
      where: { id },
      include: {
        offer: {
          include: { application: { include: { candidate: true, job: true } } },
        },
      },
    });
    if (!placement || placement.tenantId !== tenantId) {
      throw new NotFoundException('Placement not found');
    }
    return placement;
  }

  async create(tenantId: string, dto: CreatePlacementDto) {
    const offer = await this.prisma.offer.findUnique({ where: { id: dto.offerId } });
    if (!offer || offer.tenantId !== tenantId) throw new NotFoundException('Offer not found');
    if (offer.status !== 'ACCEPTED') {
      throw new ConflictException('Placement can only be created from an accepted offer');
    }

    try {
      const [placement] = await this.prisma.$transaction([
        this.prisma.placement.create({
          data: {
            tenantId,
            offerId: dto.offerId,
            jobId: dto.jobId,
            candidateId: dto.candidateId,
            clientId: dto.clientId ?? null,
            clientName: dto.clientName ?? null,
            roleName: dto.roleName,
            startDate: new Date(dto.startDate),
            salary: dto.salary,
            currency: dto.currency ?? 'RWF',
            reportingLine: dto.reportingLine ?? null,
            consultantId: dto.consultantId ?? null,
            invoiceStatus: 'GENERATED',
          },
          include: {
            offer: {
              include: { application: { include: { candidate: true, job: true } } },
            },
          },
        }),
        this.prisma.application.update({
          where: { id: offer.applicationId },
          data: { stage: 'PLACED' },
        }),
        this.prisma.job.update({
          where: { id: dto.jobId },
          data: { status: 'FILLED', closedAt: new Date() },
        }),
      ]);
      void dispatchNotification('placement-created', {
        placementId: placement.id,
        candidateId: placement.candidateId,
        candidateEmail: placement.offer.application.candidate.email,
        candidateName: `${placement.offer.application.candidate.firstName} ${placement.offer.application.candidate.lastName}`,
        jobTitle: placement.offer.application.job.title,
        clientName: placement.clientName,
        roleName: placement.roleName,
        salary: placement.salary,
        tenantId,
      });
      return placement;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A placement already exists for this offer');
      }
      throw e;
    }
  }

  async updateInvoiceStatus(tenantId: string, id: string, invoiceStatus: string) {
    const placement = await this.prisma.placement.findUnique({ where: { id } });
    if (!placement || placement.tenantId !== tenantId) {
      throw new NotFoundException('Placement not found');
    }
    return this.prisma.placement.update({
      where: { id },
      data: { invoiceStatus },
      include: {
        offer: {
          include: { application: { include: { candidate: true, job: true } } },
        },
      },
    });
  }

  async consultantMetrics(tenantId: string, consultantId: string) {
    const placements = await this.prisma.placement.findMany({
      where: { tenantId, consultantId },
      include: { offer: true },
    });

    const totalPlacements = placements.length;
    const totalRevenue = placements.reduce(
      (s: number, p: (typeof placements)[number]) => s + p.salary,
      0,
    );
    const byInvoiceStatus: Record<string, number> = {};
    for (const p of placements) {
      byInvoiceStatus[p.invoiceStatus] = (byInvoiceStatus[p.invoiceStatus] ?? 0) + 1;
    }

    return { consultantId, totalPlacements, totalRevenue, byInvoiceStatus };
  }

  requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return tenantId;
  }
}
