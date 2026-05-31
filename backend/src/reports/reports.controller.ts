import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('reports:view')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue(@Query() query: Record<string, string>) {
    return this.reports.getRevenueByMonth(query);
  }

  @Get('pipeline')
  pipeline() {
    return this.reports.getPipelineFunnel();
  }

  @Get('expenses-category')
  expensesCategory(@Query() query: Record<string, string>) {
    return this.reports.getExpensesByCategory(query);
  }

  @Get('outstanding')
  outstanding() {
    return this.reports.getOutstandingInvoices();
  }

  @Get('customer-acquisition')
  customerAcquisition(@Query() query: Record<string, string>) {
    return this.reports.getCustomerAcquisition(query);
  }

  @Get('bookings')
  bookings(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('location') location: string,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('Start date and end date are required');
    return this.reports.getBookingReport(startDate, endDate, location);
  }

  @Get('leads')
  leadsFunnel() {
    return this.reports.getLeadsFunnel();
  }

  @Get()
  accounting(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('Start date and end date are required');
    return this.reports.getAccountingReport(startDate, endDate);
  }
}
