import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LineItemDto } from '../../finance/dto/line-item.dto';

// Server-controlled fields (orderNumber, subtotal, tax, total, approval*,
// createdById, fromQuoteId, status transitions) are deliberately omitted — they
// are set by the service / approval / conversion workflows, never the client.
export class CreateSalesOrderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsOptional()
  @IsString()
  deal?: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsIn(['draft', 'confirmed'])
  status?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
