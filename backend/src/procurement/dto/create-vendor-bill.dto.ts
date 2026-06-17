import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { LineItemDto } from '../../finance/dto/line-item.dto';

export class CreateVendorBillDto {
  @IsString() @IsNotEmpty() title: string;

  @IsString() @IsNotEmpty() supplier: string;

  @IsOptional() @IsString() purchaseOrder?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsString() costCenterId?: string; // optional analytic cost center
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsBoolean() taxInclusive?: boolean;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
