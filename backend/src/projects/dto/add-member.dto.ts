import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString() @IsNotEmpty() userId: string;
  @IsOptional() @IsString() role?: string;
}
