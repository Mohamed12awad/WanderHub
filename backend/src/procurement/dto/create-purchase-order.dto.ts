import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { LineItemDto } from '../../finance/dto/line-item.dto';

export class CreatePurchaseOrderDto {
  @IsString() @IsNotEmpty() title: string;

  // Mapped to supplierId by the service.
  @IsNotEmpty() supplier: any;

  @IsOptional()
  @IsIn(['draft', 'sent', 'confirmed', 'received', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() expectedDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsNumber() taxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
