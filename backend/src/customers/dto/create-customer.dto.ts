import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;

  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() preferredContactMethod?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsObject() identification?: Record<string, unknown>;
  @IsOptional() @IsObject() paymentInformation?: Record<string, unknown>;
  @IsOptional() @IsObject() loyaltyProgram?: Record<string, unknown>;
  @IsOptional() @IsObject() emergencyContact?: Record<string, unknown>;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;

  @IsOptional() @IsString() dateOfBirth?: string;

  // service cleanData maps owner -> ownerId
  @IsOptional() @IsString() owner?: string;
}
