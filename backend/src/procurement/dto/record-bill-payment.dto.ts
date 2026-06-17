import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordBillPaymentDto {
  // Must be > 0: a negative or zero payment would corrupt the bill's paid status.
  @IsNumber() @IsPositive() amount: number;
  @IsString() date: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() accountId?: string;
}
