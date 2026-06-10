import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

// The frontend submits the relation alias `linkedTo` (+ `linkedModel`); the
// service resolves it to linkedToId and derives customerId/dealId. createdById
// is set from the auth context and must not come from the client.
export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // Frontend field; the service maps this to linkedToId.
  @IsString()
  @IsNotEmpty()
  linkedTo: string;

  @IsString()
  @IsNotEmpty()
  linkedModel: string;

  // Accepted as an alternative to `linkedTo` for non-UI callers.
  @IsOptional()
  @IsString()
  linkedToId?: string;

  // Assignee id; the service maps it to assignedToId.
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
