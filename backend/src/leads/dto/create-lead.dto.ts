import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() owner?: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'qualified', 'unqualified', 'converted'])
  status?: string;
}
