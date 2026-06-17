import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

// The frontend submits relation aliases `assignedTo` and (optionally) `linkedTo`
// + `linkedModel`; the service maps them to assignedToId / linkedToId / dealId.
// completedAt and createdById are managed server-side.
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  // Assignee id; the service maps it to assignedToId.
  @IsOptional()
  @IsString()
  assignedTo?: string;

  // Linked record; the service maps `linkedTo` to linkedToId.
  @IsOptional()
  @IsString()
  linkedTo?: string;

  @IsOptional()
  @IsString()
  linkedToId?: string;

  @IsOptional()
  @IsString()
  linkedModel?: string;

  // Project FK; maps to projectId in the service.
  @IsOptional()
  @IsString()
  project?: string;

  // Milestone FK; maps to milestoneId in the service.
  @IsOptional()
  @IsString()
  milestone?: string;

  // Planning figure. Actual cost is computed (not stored) from attributed expenses.
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
