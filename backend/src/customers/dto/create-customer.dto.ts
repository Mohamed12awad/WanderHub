import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;

  // Individual vs company. Defaults to `individual` in the DB when omitted. The
  // type-specific identity fields below are all optional structured extras — the
  // canonical required field is `name`; which extras are surfaced/required in the
  // UI is driven by the workspace field config, not hardcoded here.
  @IsOptional() @IsEnum(ContactType) type?: ContactType;

  // Individual-only structured fields (optional).
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;

  // Company-only structured fields (optional).
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() taxId?: string;

  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() website?: string;
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
