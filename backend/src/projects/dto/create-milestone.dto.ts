import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed'])
  status?: string;

  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsNumber() order?: number;
}
