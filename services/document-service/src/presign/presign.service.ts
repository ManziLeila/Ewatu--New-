import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EwatuRole, type AuthUser } from '@ewatu/common-auth';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignUploadDto } from './dto/presign-upload.dto';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class PresignService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.getOrThrow<string>('S3_ENDPOINT');
    const region = config.get('S3_REGION', 'us-east-1');
    const accessKeyId = config.getOrThrow<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.getOrThrow<string>('S3_SECRET_KEY');
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  private resolveTenantId(user: AuthUser): string {
    const tenantId = user.tenant_id?.trim();
    if (!tenantId) {
      throw new ForbiddenException(
        'Presign requires a tenant-scoped account (tenant_id must be present in your access token).',
      );
    }
    const canUpload =
      user.roles.includes(EwatuRole.TENANT_ADMIN) ||
      user.roles.includes(EwatuRole.PLATFORM_SUPER_ADMIN) ||
      user.roles.includes(EwatuRole.HR_MANAGER) ||
      user.roles.includes(EwatuRole.RECRUITER);
    if (!canUpload) {
      throw new ForbiddenException(
        'You need TENANT_ADMIN, HR_MANAGER, or RECRUITER to upload files.',
      );
    }
    return tenantId;
  }

  async createPresignedPut(user: AuthUser, dto: PresignUploadDto) {
    const tenantId = this.resolveTenantId(user);
    return this.createPresignedPutForTenant(tenantId, dto);
  }

  async createPresignedPutForTenant(
    tenantId: string,
    dto: Pick<PresignUploadDto, 'objectKey' | 'contentType' | 'fileSize'>,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(dto.contentType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (dto.fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        'File size exceeds maximum allowed size of 10MB',
      );
    }

    const key = `tenants/${tenantId}/${dto.objectKey}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const expires = 3600;
    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expires });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ServiceUnavailableException(`Storage error: ${msg}`);
    }

    const endpoint = this.config.get<string>('S3_ENDPOINT')?.replace(/\/$/, '') ?? '';
    const objectUrl = endpoint ? `${endpoint}/${this.bucket}/${key}` : key;

    return {
      uploadUrl,
      objectUrl,
      method: 'PUT' as const,
      headers: { 'Content-Type': dto.contentType },
      key,
      bucket: this.bucket,
      expiresInSeconds: expires,
    };
  }

  /** The bucket is private, so the bare `objectUrl` returned above 404s/403s on GET —
   *  callers that need to let a user actually view/download a stored file must ask for
   *  a signed GET URL here instead. `key` is the exact key as stored (already includes
   *  the `tenants/<id>/` prefix if the caller's own record has it baked in). */
  async purgeTenantObjects(tenantId: string) {
    const prefix = `tenants/${tenantId}/`;
    let removed = 0;
    let continuationToken: string | undefined;
    do {
      const list = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const objects = (list.Contents ?? [])
        .map((o) => (o.Key ? { Key: o.Key } : null))
        .filter((o): o is { Key: string } => Boolean(o));
      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects },
          }),
        );
        removed += objects.length;
      }
      continuationToken = list.NextContinuationToken;
    } while (continuationToken);
    return { tenantId, objectsRemoved: removed };
  }

  async createPresignedGetForKey(key: string, expiresIn = 900): Promise<{ downloadUrl: string }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    try {
      const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });
      return { downloadUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ServiceUnavailableException(`Storage error: ${msg}`);
    }
  }
}
