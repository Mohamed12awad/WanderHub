import { IsNumber, IsOptional, IsString } from 'class-validator';

// invoiceId comes from the route param and createdById from the auth context;
// neither is accepted from the body.
export class RecordPaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  date: string;

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
