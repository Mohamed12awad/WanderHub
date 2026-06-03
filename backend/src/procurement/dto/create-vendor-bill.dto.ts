import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { LineItemDto } from '../../finance/dto/line-item.dto';

export class CreateVendorBillDto {
  @IsString() @IsNotEmpty() title: string;

  @IsString() @IsNotEmpty() supplier: string;

  @IsOptional() @IsString() purchaseOrder?: string;

  @IsOptional()
  @IsIn(['draft', 'received', 'partially_paid', 'paid', 'overdue', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsNumber() taxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
