import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ExpenseItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  // Optional cost attribution — drives the computed actualCost on Task/Milestone.
  @IsOptional() @IsString() taskId?: string;
  @IsOptional() @IsString() milestoneId?: string;
}
