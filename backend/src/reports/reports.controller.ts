import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  @RequirePermission('reports:view')
  async revenue(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.reports.getRevenueByMonth(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('pipeline')
  @RequirePermission('reports:view')
  async pipeline(@Res() res: Response) {
    try { return res.json(await this.reports.getPipelineFunnel()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('expenses-category')
  @RequirePermission('reports:view')
  async expensesCategory(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.reports.getExpensesByCategory(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('outstanding')
  @RequirePermission('reports:view')
  async outstanding(@Res() res: Response) {
    try { return res.json(await this.reports.getOutstandingInvoices()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('customer-acquisition')
  @RequirePermission('reports:view')
  async customerAcquisition(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.reports.getCustomerAcquisition(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('bookings')
  @RequirePermission('reports:view')
  async bookings(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('location') location: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start date and end date are required' });
    try { return res.json(await this.reports.getBookingReport(startDate, endDate, location)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get()
  @RequirePermission('reports:view')
  async accounting(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start date and end date are required' });
    try { return res.json(await this.reports.getAccountingReport(startDate, endDate)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
