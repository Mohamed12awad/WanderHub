import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() balance?: number;
  /** Link to a specific GL account; when omitted, one is auto-created under 1100. */
  @IsOptional() @IsString() chartOfAccountId?: string;
}
