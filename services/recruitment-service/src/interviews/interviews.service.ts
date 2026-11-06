import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dispatchNotification } from '../common/notification.dispatch';
import type { CreateInterviewDto, CreateScorecardDto } from './dtos/create-interview.dto';
import type { UpdateInterviewDto } from './dtos/update-interview.dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, applicationId?: string) {
    return this.prisma.interview.findMany({
      where: {
        tenantId,
        ...(applicationId ? { applicationId } : {}),
      },
      include: {
        application: { include: { candidate: true, job: true } },
        scorecards: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        application: { include: { candidate: true, job: true } },
        scorecards: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }
    return interview;
  }

  async create(tenantId: string, dto: CreateInterviewDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
    });
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException('Application not found');
    }
    const interview = await this.prisma.interview.create({
      data: {
        tenantId,
        applicationId: dto.applicationId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin ?? 60,
        type: dto.type ?? 'VIDEO',
        interviewerIds: dto.interviewerIds ?? [],
        locationOrLink: dto.locationOrLink ?? null,
        status: 'SCHEDULED',
        feedback: dto.feedback ?? null,
      },
      include: {
        application: { include: { candidate: true, job: true } },
        scorecards: true,
      },
    });
    void dispatchNotification('interview-scheduled', {
      applicationId: interview.applicationId,
      candidateEmail: interview.application.candidate.email,
      candidateName: `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`,
      jobTitle: interview.application.job.title,
      scheduledAt: interview.scheduledAt,
      type: interview.type,
      locationOrLink: interview.locationOrLink,
      tenantId,
    });
    return interview;
  }

  async update(tenantId: string, id: string, dto: UpdateInterviewDto) {
    const interview = await this.prisma.interview.findUnique({ where: { id } });
    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.interviewerIds !== undefined) data.interviewerIds = dto.interviewerIds;
    if (dto.locationOrLink !== undefined) data.locationOrLink = dto.locationOrLink;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.outcome !== undefined) data.outcome = dto.outcome;
    if (dto.feedback !== undefined) data.feedback = dto.feedback;

    return this.prisma.interview.update({
      where: { id },
      data,
      include: {
        application: { include: { candidate: true, job: true } },
        scorecards: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async addScorecard(
    tenantId: string,
    interviewId: string,
    dto: CreateScorecardDto,
    submittedBy: string,
  ) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }
    return this.prisma.interviewScorecard.create({
      data: {
        tenantId,
        interviewId,
        competency: dto.competency,
        score: dto.score,
        notes: dto.notes ?? null,
        submittedBy,
      },
    });
  }

  async getScorecards(tenantId: string, interviewId: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }
    const scorecards = await this.prisma.interviewScorecard.findMany({
      where: { interviewId },
      orderBy: { createdAt: 'asc' },
    });

    const byCompetency: Record<string, { scores: number[]; avg: number }> = {};
    for (const s of scorecards) {
      const entry = byCompetency[s.competency] ?? { scores: [], avg: 0 };
      entry.scores.push(s.score);
      byCompetency[s.competency] = entry;
    }
    for (const key of Object.keys(byCompetency)) {
      const bucket = byCompetency[key];
      if (!bucket || bucket.scores.length === 0) continue;
      const arr = bucket.scores;
      bucket.avg =
        Math.round((arr.reduce((a: number, b: number) => a + b, 0) / arr.length) * 10) / 10;
    }

    const overallAvg =
      scorecards.length > 0
        ? Math.round(
            (scorecards.reduce((s: number, c) => s + c.score, 0) / scorecards.length) * 10,
          ) / 10
        : null;

    return { scorecards, byCompetency, overallAvg };
  }

  requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return tenantId;
  }
}
