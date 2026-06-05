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
import { LineItemDto } from './line-item.dto';

// Note the deliberately omitted, server-controlled fields: quoteNumber,
// subtotal, tax, total, approvalStatus, approvedById, approvedAt,
// rejectionReason, convertedToInvoiceId, createdById. These are set by the
// service / approval workflow and must never come from the client.
export class CreateQuoteDto {
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
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

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
