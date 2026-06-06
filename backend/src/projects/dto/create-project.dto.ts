import { IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;

  // Mapped to customerId / dealId / managerId by the service.
  @IsOptional() customer?: string | { _id?: string; id?: string };
  @IsOptional() deal?: string | { _id?: string; id?: string };
  @IsOptional() manager?: string | { _id?: string; id?: string };
}
