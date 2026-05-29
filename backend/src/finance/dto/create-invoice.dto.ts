import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
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

  // Mapped to customerId by the service (accepts an id or { _id }).
  @IsNotEmpty()
  customer: any;

  @IsOptional()
  deal?: any;

  @IsOptional()
  @IsIn(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'])
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

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
