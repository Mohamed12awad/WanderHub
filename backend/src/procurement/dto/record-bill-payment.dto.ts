import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordBillPaymentDto {
  @IsNumber() amount: number;
  @IsString() date: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() accountId?: string;
}
