import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LineItemDto } from './line-item.dto';

// Server-controlled fields are deliberately omitted: invoiceNumber, subtotal,
// tax, total, totalPaid, approvalStatus, approvedById, approvedAt,
// rejectionReason, createdById. Payment-derived status/totalPaid are managed by
// the payment endpoints, never by direct invoice writes.
export class CreateInvoiceDto {
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
  status?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  // Optional analytic cost center.
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  // When true, line unit prices already include tax (tax is back-calculated out).
  // Omitted → the org default from WorkspaceConfig.invoiceDefaults.taxInclusive.
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
