import { IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsString() @IsNotEmpty() title: string;

  // service cleanData maps customer -> customerId
  @IsOptional() @IsString() customer?: string;
  // service cleanData maps owner -> ownerId
  @IsOptional() @IsString() owner?: string;

  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() probability?: number;

  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() dealType?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() lostReason?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsString() expectedCloseDate?: string;

  @IsOptional()
  @IsIn(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'])
  status?: string;

  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
}
