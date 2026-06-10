import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() notes?: string;
}
