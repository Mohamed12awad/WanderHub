import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  subject: string;

  @IsString() @IsNotEmpty() @MaxLength(20000)
  body: string;

  @IsOptional() @IsString()
  linkedToId?: string;

  @IsOptional() @IsIn(['Customer', 'Deal', 'Lead'])
  linkedModel?: string;
}
