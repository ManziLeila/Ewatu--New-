import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

/** Typing the tenant slug confirms irreversible delete. */
export class PurgeTenantDto {
  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  confirmSlug!: string;
}
