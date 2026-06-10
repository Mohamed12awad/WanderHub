import { Type } from 'class-transformer';
import {
  IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { LineItemDto } from '../../finance/dto/line-item.dto';

export class CreatePurchaseOrderDto {
  @IsString() @IsNotEmpty() title: string;

  @IsString() @IsNotEmpty() supplier: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() expectedDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];
}
