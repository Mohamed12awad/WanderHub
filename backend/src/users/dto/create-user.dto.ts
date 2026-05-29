import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// `role` and `reportsTo` are accepted as id strings and mapped to roleId /
// reportsToId by the service. Server-managed fields (roleId, reportsToId,
// createdAt, updatedAt, id) are intentionally not accepted from the client.
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsString()
  reportsTo?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
