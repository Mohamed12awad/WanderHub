import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCostCenterDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Optional parent cost center (for a hierarchy). */
  @IsOptional() @IsString() parentId?: string;
}

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto) {}
