import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { parseReportParams } from './report-utils';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('reports')
@RequirePermission('reports:view')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // ── Core reports ──────────────────────────────────────────────────────────

  @Get('revenue')
  revenue(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getRevenueByMonth(parseReportParams(query), user);
  }

  @Get('pipeline')
  pipeline(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getPipelineFunnel(parseReportParams(query), user);
  }

  @Get('expenses-category')
  expensesCategory(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getExpensesByCategory(parseReportParams(query), user);
  }

  @Get('outstanding')
  outstanding(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getOutstandingInvoices(parseReportParams(query), user);
  }

  @Get('customer-acquisition')
  customerAcquisition(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getCustomerAcquisition(parseReportParams(query), user);
  }

  @Get('leads')
  leadsFunnel(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getLeadsFunnel(parseReportParams(query), user);
  }

  // ── New analytics — Sales ───────────────────────────────────────────────────

  @Get('sales-leaderboard')
  salesLeaderboard(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getSalesLeaderboard(parseReportParams(query), user);
  }

  @Get('conversion-funnel')
  conversionFunnel(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getConversionFunnel(parseReportParams(query), user);
  }

  @Get('deal-metrics')
  dealMetrics(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getDealMetrics(parseReportParams(query), user);
  }

  // ── New analytics — Finance ─────────────────────────────────────────────────

  @Get('profit-loss')
  profitLoss(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getProfitLoss(parseReportParams(query), user);
  }

  @Get('ar-aging')
  arAging(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getArAging(parseReportParams(query), user);
  }

  @Get('top-customers')
  topCustomers(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getTopCustomers(parseReportParams(query), user);
  }

  @Get('expense-trend')
  expenseTrend(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getExpenseTrend(parseReportParams(query), user);
  }

  // ── New analytics — Operations ──────────────────────────────────────────────

  @Get('top-products')
  topProducts(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getTopProducts(parseReportParams(query), user);
  }

  @Get('inventory-valuation')
  inventoryValuation() {
    return this.reports.getInventoryValuation();
  }

  @Get('task-stats')
  taskStats(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.reports.getTaskStats(parseReportParams(query), user);
  }

  // ── Legacy date+location reports (kept for the Deals/Full report tabs) ───────

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
