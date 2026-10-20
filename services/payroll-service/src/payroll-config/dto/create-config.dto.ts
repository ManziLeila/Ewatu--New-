import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  payDay?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  payeEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rssbPensionEmployee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rssbPensionEmployer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rssbMedical?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cbhiRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maternityLevy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  occupationalHazardRate?: number;
}
