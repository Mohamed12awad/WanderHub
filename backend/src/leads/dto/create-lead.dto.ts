import { IsNotEmpty, IsObject, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() campaign?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() lostReason?: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;

  @IsOptional() @IsString() status?: string;

  @IsOptional() @IsString() rating?: string;
}
