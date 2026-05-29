import { IsNumber, IsOptional, IsString } from 'class-validator';

// On edit, date is optional (the service falls back to the existing date), but
// amount is still required since the totals are recomputed from it.
export class EditPaymentDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}
