import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  name: string;

  /** The user identity the key acts as; defaults to the creator. */
  @IsOptional() @IsString()
  userId?: string;
}
