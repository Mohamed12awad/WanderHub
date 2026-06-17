import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsNumber() order?: number;

  // Planning figure. Actual cost is computed (not stored) from attributed expenses.
  @IsOptional() @IsNumber() estimatedCost?: number;
}
