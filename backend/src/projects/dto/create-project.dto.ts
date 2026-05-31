import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional()
  @IsIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;

  // Mapped to customerId / dealId / managerId by the service.
  @IsOptional() customer?: any;
  @IsOptional() deal?: any;
  @IsOptional() manager?: any;
}
