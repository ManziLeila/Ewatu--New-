import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dispatchNotification } from '../common/notification.dispatch';
import type { CreateOfferDto } from './dtos/create-offer.dto';
import type { UpdateOfferDto } from './dtos/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, filters?: { jobId?: string; candidateId?: string; status?: string }) {
    return this.prisma.offer.findMany({
      where: {
        tenantId,
        ...(filters?.jobId ? { jobId: filters.jobId } : {}),
        ...(filters?.candidateId ? { candidateId: filters.candidateId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
    if (!offer || offer.tenantId !== tenantId) throw new NotFoundException('Offer not found');
    return offer;
  }

  async create(tenantId: string, dto: CreateOfferDto, createdBy: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
    });
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.offer.create({
      data: {
        tenantId,
        applicationId: dto.applicationId,
        jobId: dto.jobId,
        candidateId: dto.candidateId,
        salary: dto.salary,
        currency: dto.currency ?? 'RWF',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        probationDays: dto.probationDays ?? 90,
        status: dto.status ?? 'DRAFT',
        offerLetterUrl: dto.offerLetterUrl ?? null,
        counterNotes: dto.counterNotes ?? null,
        createdBy,
      },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer || offer.tenantId !== tenantId) throw new NotFoundException('Offer not found');

    const data: Record<string, unknown> = {};
    if (dto.salary !== undefined) data.salary = dto.salary;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.probationDays !== undefined) data.probationDays = dto.probationDays;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.offerLetterUrl !== undefined) data.offerLetterUrl = dto.offerLetterUrl;
    if (dto.signatureStatus !== undefined) data.signatureStatus = dto.signatureStatus;
    if (dto.counterNotes !== undefined) data.counterNotes = dto.counterNotes;

    return this.prisma.offer.update({
      where: { id },
      data,
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
  }

  async sendOffer(id: string, tenantId: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'DRAFT') {
      throw new BadRequestException('Offer can only be sent when in DRAFT status');
    }
    const updated = await this.prisma.offer.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
    void dispatchNotification('offer-sent', {
      offerId: updated.id,
      candidateId: updated.candidateId,
      candidateEmail: updated.application.candidate.email,
      candidateName: `${updated.application.candidate.firstName} ${updated.application.candidate.lastName}`,
      jobTitle: updated.application.job.title,
      jobId: updated.jobId,
      salary: updated.salary,
      currency: updated.currency,
      tenantId,
    });
    return updated;
  }

  async acceptOffer(id: string, tenantId: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'SENT') {
      throw new BadRequestException('Offer can only be accepted when in SENT status');
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
  }

  async rejectOffer(id: string, tenantId: string, rejectionReason?: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'SENT') {
      throw new BadRequestException('Offer can only be rejected when in SENT status');
    }
    return this.prisma.offer.update({
      where: { id },
      data: {
        status: 'REJECTED',
        ...(rejectionReason ? { rejectionReason } : {}),
      },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
  }

  async withdrawOffer(id: string, tenantId: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status === 'ACCEPTED') {
      throw new BadRequestException('Accepted offers cannot be withdrawn');
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
      include: {
        application: { include: { candidate: true, job: true } },
        placement: true,
      },
    });
  }

  requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return tenantId;
  }
}
