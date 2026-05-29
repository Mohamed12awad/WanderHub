import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
