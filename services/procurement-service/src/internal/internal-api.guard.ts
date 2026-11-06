import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!key || req.headers['x-internal-key'] !== key) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
