import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

export class CreateChartOfAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(ACCOUNT_TYPES)
  type!: (typeof ACCOUNT_TYPES)[number];

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Optional link to an existing cash/bank Account (asset accounts only). */
  @IsOptional()
  @IsString()
  cashAccountId?: string;
}

export class UpdateChartOfAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  type?: (typeof ACCOUNT_TYPES)[number];

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  cashAccountId?: string | null;
}
