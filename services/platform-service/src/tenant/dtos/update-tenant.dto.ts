import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

/** Super-admin update of tenant metadata (not branding — see my/tenant/settings). */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['starter', 'professional', 'enterprise', 'custom'])
  plan?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  country?: string;
}
