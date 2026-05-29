import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString() @IsNotEmpty() itemName: string;
  @IsString() @IsNotEmpty() supplier: string;
  @IsNumber() quantity: number;
  @IsNumber() price: number;
  @IsString() date: string;
  @IsOptional() @IsNumber() shippingCost?: number;
  @IsOptional() @IsNumber() tax?: number;
  @IsOptional() @IsNumber() insurance?: number;
  @IsOptional() @IsNumber() otherCosts?: number;
}
