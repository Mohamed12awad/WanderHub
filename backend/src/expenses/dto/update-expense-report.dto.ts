import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseReportDto } from './create-expense-report.dto';

export class UpdateExpenseReportDto extends PartialType(CreateExpenseReportDto) {}
