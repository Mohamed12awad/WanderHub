import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('reports')
@RequirePermission('reports:view')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getRevenueByMonth(query, user);
  }

  @Get('pipeline')
  pipeline(@CurrentUser() user: AuthUser) {
    return this.reports.getPipelineFunnel(user);
  }

  @Get('expenses-category')
  expensesCategory(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getExpensesByCategory(query, user);
  }

  @Get('outstanding')
  outstanding(@CurrentUser() user: AuthUser) {
    return this.reports.getOutstandingInvoices(user);
  }

  @Get('customer-acquisition')
  customerAcquisition(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getCustomerAcquisition(query, user);
  }

  @Get('bookings')
  bookings(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('location') location: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('Start date and end date are required');
    return this.reports.getBookingReport(startDate, endDate, user, location);
  }

  @Get('leads')
  leadsFunnel(@CurrentUser() user: AuthUser) {
    return this.reports.getLeadsFunnel(user);
  }

  @Get()
  accounting(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('Start date and end date are required');
    return this.reports.getAccountingReport(startDate, endDate, user);
  }
}
