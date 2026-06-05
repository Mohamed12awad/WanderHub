import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ExpenseItemDto } from './expense-item.dto';

// Approval state (approved, approvalStatus, approvedById, approvedAt,
// rejectionReason) and ownership (userId) are set exclusively by the service
// and the dedicated approve/reject endpoints — never accepted from the client.
export class CreateExpenseReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  expenses?: ExpenseItemDto[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
