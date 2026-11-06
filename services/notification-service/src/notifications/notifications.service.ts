import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, type EmailTemplate } from '../email/email.service';

export type DispatchDto = {
  channel: 'email' | 'in_app' | 'both';
  to?: string;
  userId?: string;
  tenantId?: string;
  title?: string;
  body?: string;
  template?: EmailTemplate;
  payload?: Record<string, unknown>;
};

const PAYLOAD_EMAIL_KEYS = [
  'email',
  'employeeEmail',
  'candidateEmail',
  'businessEmail',
  'to',
  'recipientEmail',
] as const;

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  dispatch(dto: DispatchDto) {
    setImmediate(() => {
      void this.processDispatch(dto).catch((e) => {
        this.log.warn(`Async dispatch failed: ${e instanceof Error ? e.message : e}`);
      });
    });
    return { accepted: true, queued: true };
  }

  private emailFromPayload(payload: Record<string, unknown> | undefined): string | undefined {
    if (!payload) return undefined;
    for (const key of PAYLOAD_EMAIL_KEYS) {
      const v = payload[key];
      if (typeof v === 'string' && v.includes('@')) {
        return v.trim().toLowerCase();
      }
    }
    return undefined;
  }

  private async lookupEmailByUserId(userId: string): Promise<string | undefined> {
    const base = this.config.get<string>('IDENTITY_SERVICE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!base || !key) return undefined;
    try {
      const res = await fetch(
        `${base}/api/v1/internal/users/by-id?userId=${encodeURIComponent(userId)}`,
        { headers: { 'x-internal-key': key } },
      );
      if (!res.ok) return undefined;
      const json = (await res.json()) as { data?: { id?: string; email?: string } | null };
      return json.data?.email?.trim().toLowerCase();
    } catch {
      return undefined;
    }
  }

  private async lookupUserIdByEmail(email: string): Promise<string | undefined> {
    const base = this.config.get<string>('IDENTITY_SERVICE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!base || !key) return undefined;
    try {
      const res = await fetch(
        `${base}/api/v1/internal/users/by-email?email=${encodeURIComponent(email)}`,
        { headers: { 'x-internal-key': key } },
      );
      if (!res.ok) return undefined;
      const json = (await res.json()) as { data?: { id?: string; email?: string } | null };
      return json.data?.id;
    } catch {
      return undefined;
    }
  }

  private async resolveRecipient(dto: DispatchDto): Promise<{ to?: string; userId?: string }> {
    const payload = dto.payload ?? {};
    let to = dto.to?.trim().toLowerCase() || this.emailFromPayload(payload);
    let userId = dto.userId;

    if (!to && userId) {
      to = await this.lookupEmailByUserId(userId);
    }
    if (!userId && to) {
      userId = await this.lookupUserIdByEmail(to);
    }

    return { to, userId };
  }

  private async processDispatch(dto: DispatchDto) {
    const payload = dto.payload ?? {};
    const { to, userId } = await this.resolveRecipient(dto);
    const template: EmailTemplate | undefined =
      dto.template ?? (typeof payload.subject === 'string' ? 'generic' : undefined);

    const wantsInApp = dto.channel === 'in_app' || dto.channel === 'both';
    const label = String(payload.notificationType ?? dto.title ?? 'notification');

    // Email-first: send whenever we have an address and content template.
    if (to && template) {
      await this.email.send(to, template, payload);
    } else if (dto.channel === 'email' || dto.channel === 'both') {
      this.log.warn(
        `Email not sent for "${label}" — no recipient address (set user/employee/candidate email).`,
      );
    }

    if (wantsInApp && userId && dto.title && dto.body) {
      await this.prisma.notification.create({
        data: {
          userId,
          tenantId: dto.tenantId ?? null,
          title: dto.title,
          body: dto.body,
          channel: 'in_app',
        },
      });
    }
  }

  listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) return null;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
