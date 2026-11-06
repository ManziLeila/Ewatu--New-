import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EwatuRole, getPermissionsForRoles } from '@ewatu/common-auth';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken, generateRawToken } from '../common/token-hash';
import { dispatchEmail } from '../common/email.dispatch';
import { dispatchNotification } from '../common/notification.dispatch';
import { RefreshTokenService } from './refresh-token.service';
import type { LoginDto } from './dtos/login.dto';
import type { RegisterDto } from './dtos/register.dto';
import type { ProvisionTenantOwnerDto } from '../internal/dtos/provision-tenant-owner.dto';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const ACCOUNT_LOCKED_MESSAGE = 'ACCOUNT_LOCKED';
export const EMAIL_NOT_VERIFIED_MESSAGE = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /** First user only → platform super admin (bootstrap). Everyone else must use company onboarding. */
  async register(dto: RegisterDto) {
    const count = await this.prisma.user.count();
    if (count > 0) {
      throw new ForbiddenException({
        message: 'Open registration is disabled. Register your company at /register-company.',
      });
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName?.trim() || null,
        roles: [EwatuRole.PLATFORM_SUPER_ADMIN],
        emailVerified: true,
      },
    });

    const refreshToken = await this.refreshTokens.generateRefreshToken(user.id, user.tenantId);
    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const locking = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: locking ? 0 : attempts,
          lockedUntil: locking ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });
      if (locking) {
        throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
      }
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.active) {
      throw new UnauthorizedException('This account has been deactivated');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        `Please verify your email before signing in. Check your inbox for the activation link. ${EMAIL_NOT_VERIFIED_MESSAGE}`,
      );
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const refreshToken = await this.refreshTokens.generateRefreshToken(user.id, user.tenantId);
    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
    };
  }

  /** Always resolves without revealing whether the email exists. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const rawToken = generateRawToken();
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordTokenHash: hashToken(rawToken),
          resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const webOrigin = (
        (this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173').split(',')[0] ??
        'http://localhost:5173'
      ).trim();
      const resetLink = `${webOrigin}/reset-password?token=${rawToken}`;

      void dispatchEmail(user.email, 'password-reset', { resetLink }, user.tenantId ?? undefined);
    }

    return { message: 'Password reset link sent successfully.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordTokenHash: hashToken(token) },
    });
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return { reset: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { changed: true };
  }

  async refresh(rawRefreshToken: string) {
    const { userId } = await this.refreshTokens.validateAndRotate(rawRefreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = await this.refreshTokens.generateRefreshToken(user.id, user.tenantId);
    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
    };
  }

  async logout(rawRefreshToken: string) {
    await this.refreshTokens.revokeByRawToken(rawRefreshToken);
    return { success: true };
  }

  /** Issue (or re-issue) activation link and send verify-email template. */
  async sendEmailVerification(userId: string): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerified) {
      return { sent: false };
    }
    const rawToken = generateRawToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: hashToken(rawToken) },
    });
    const verifyUrl = this.buildVerifyUrl(rawToken);
    return dispatchEmail(user.email, 'verify-email', { verifyUrl }, user.tenantId ?? undefined);
  }

  async resendVerificationEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return {
        message:
          'If an account exists and is not yet verified, we sent a new activation link to that email address.',
      };
    }
    if (user.emailVerified) {
      return {
        message: 'This email is already verified. You can sign in with your password.',
        alreadyVerified: true,
      };
    }
    const { sent } = await this.sendEmailVerification(user.id);
    return {
      message: sent
        ? 'We sent a new activation link. Open the latest email only — older links stop working after you resend.'
        : 'We could not send email right now. Check that notification-service is running and try again in a moment.',
      sent,
    };
  }

  async verifyEmail(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Token required');
    }
    const hashedIncoming = hashToken(token.trim());
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: hashedIncoming },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    if (user.emailVerified) {
      return { verified: true, alreadyVerified: true };
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    if (user.tenantId) {
      await this.notifyPlatformEmailVerified(user.tenantId);
    }
    return { verified: true };
  }

  async provisionTenantOwner(dto: ProvisionTenantOwnerDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
        roles: [EwatuRole.TENANT_ADMIN],
        tenantId: dto.tenantId,
        emailVerified: false,
      },
    });

    void this.sendEmailVerification(user.id);

    return { userId: user.id };
  }

  private buildVerifyUrl(rawToken: string): string {
    const webOrigin = (
      (this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173').split(',')[0] ??
      'http://localhost:5173'
    ).trim();
    return `${webOrigin}/verify-email?token=${encodeURIComponent(rawToken)}`;
  }

  async findUserIdByEmail(email: string): Promise<{ id: string; email: string } | null> {
    if (!email) return null;
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true },
    });
    return user ?? null;
  }

  async findUserById(userId: string): Promise<{ id: string; email: string } | null> {
    if (!userId?.trim()) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
      select: { id: true, email: true, active: true },
    });
    if (!user?.active) return null;
    return { id: user.id, email: user.email };
  }

  async findUsersByTenantRoles(
    tenantId: string,
    roles: string[],
  ): Promise<Array<{ id: string; email: string }>> {
    if (!tenantId || roles.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { tenantId, active: true },
      select: { id: true, email: true, roles: true },
    });
    const wanted = new Set(roles);
    return users
      .filter((u) => u.roles.some((r) => wanted.has(r)))
      .map((u) => ({ id: u.id, email: u.email }));
  }

  private async notifyPlatformEmailVerified(tenantId: string) {
    const base = this.config.get<string>('PLATFORM_SERVICE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!base || !key) return;
    try {
      await fetch(`${base}/api/v1/internal/tenants/${tenantId}/email-verified`, {
        method: 'PATCH',
        headers: { 'x-internal-key': key },
      });
    } catch {
      // non-fatal
    }
  }

  /** Fetches the tenant's current lifecycle status from platform-service. Fails open (ACTIVE) on
   *  any error — an outage in platform-service shouldn't lock every tenant out of logging in. */
  private async resolveTenantStatus(tenantId: string): Promise<string> {
    const base = this.config.get<string>('PLATFORM_SERVICE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!base || !key) return 'ACTIVE';
    try {
      const res = await fetch(`${base}/api/v1/internal/tenants/${tenantId}`, {
        headers: { 'x-internal-key': key },
      });
      if (!res.ok) return 'ACTIVE';
      const body = (await res.json()) as { data?: { status?: string } };
      return body.data?.status ?? 'ACTIVE';
    } catch {
      return 'ACTIVE';
    }
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    displayName: string | null;
    roles: string[];
    tenantId: string | null;
    emailVerified: boolean;
  }) {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const tenantStatus = user.tenantId ? await this.resolveTenantStatus(user.tenantId) : undefined;
    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        preferred_username: user.displayName ?? user.email.split('@')[0],
        roles: user.roles,
        permissions: getPermissionsForRoles(user.roles),
        tenant_id: user.tenantId ?? undefined,
        tenant_status: tenantStatus,
        email_verified: user.emailVerified,
      },
      { expiresIn },
    );
  }
}
