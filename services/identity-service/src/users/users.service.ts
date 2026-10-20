import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EwatuRole, type AuthUser } from '@ewatu/common-auth';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dtos/create-user.dto';
import type { UpdateUserDto } from './dtos/update-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private assertTenantAdmin(user: AuthUser) {
    if (!user.tenant_id) {
      throw new ForbiddenException('No company linked to this account');
    }
    if (
      !user.roles.includes(EwatuRole.TENANT_ADMIN) &&
      !user.roles.includes(EwatuRole.PLATFORM_SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Tenant admin role required');
    }
  }

  listForTenant(user: AuthUser) {
    this.assertTenantAdmin(user);
    return this.prisma.user.findMany({
      where: { tenantId: user.tenant_id! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        active: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async createForTenant(user: AuthUser, dto: CreateUserDto) {
    this.assertTenantAdmin(user);
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const allowed = Object.values(EwatuRole);
    const roles = dto.roles.filter((r) => allowed.includes(r as (typeof EwatuRole)[keyof typeof EwatuRole]));
    const safe = roles.filter(
      (r) =>
        r !== EwatuRole.PLATFORM_SUPER_ADMIN &&
        r !== EwatuRole.CLIENT_ADMIN &&
        r !== EwatuRole.CLIENT_EMPLOYEE,
    );
    if (safe.length === 0) {
      safe.push(EwatuRole.TENANT_STAFF);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
        roles: safe,
        tenantId: user.tenant_id!,
        emailVerified: false,
        active: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        active: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    void this.auth.sendEmailVerification(created.id);

    return created;
  }

  async updateForTenant(user: AuthUser, userId: string, dto: UpdateUserDto) {
    this.assertTenantAdmin(user);
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.tenantId !== user.tenant_id) {
      throw new NotFoundException('User not found');
    }
    if (target.id === user.sub && dto.active === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() || null } : {}),
        ...(dto.roles !== undefined ? { roles: dto.roles } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        active: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }
}
