import { Module } from '@nestjs/common';
import { InternalApiGuard } from '../internal/internal-api.guard';
import { InternalPresignController } from './internal-presign.controller';
import { InternalTenantController } from '../internal/internal-tenant.controller';
import { PresignController } from './presign.controller';
import { PresignService } from './presign.service';
import { S3BootstrapService } from './s3-bootstrap.service';

@Module({
  controllers: [PresignController, InternalPresignController, InternalTenantController],
  providers: [S3BootstrapService, PresignService, InternalApiGuard],
  exports: [PresignService],
})
export class PresignModule {}
