import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InvoicesController {
  constructor(private readonly finance: FinanceService) {}

  @Get('payments')
  @RequirePermission('finance:view')
  async getPayments(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.finance.getPayments(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('invoices')
  @RequirePermission('finance:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.finance.getInvoices(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('invoices/:id')
  @RequirePermission('finance:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.finance.getInvoiceById(id);
      if (!data) return res.status(404).json({ message: 'Invoice not found' });
      return res.json(data);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post('invoices')
  @RequirePermission('finance:create')
  async create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.finance.createInvoice(body, user.id)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put('invoices/:id')
  @RequirePermission('finance:edit')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const inv = await this.finance.updateInvoice(id, body);
      if (!inv) return res.status(404).json({ message: 'Invoice not found' });
      return res.json(inv);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete('invoices/:id')
  @RequirePermission('finance:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.finance.deleteInvoice(id);
      if (!ok) return res.status(404).json({ message: 'Invoice not found' });
      return res.json({ message: 'Invoice deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch('invoices/:id/approve')
  @RequirePermission('finance:approve')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const inv = await this.finance.approveInvoice(id, user.id);
      if (!inv) return res.status(404).json({ message: 'Invoice not found' });
      return res.json(inv);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch('invoices/:id/reject')
  @RequirePermission('finance:approve')
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser, @Res() res: Response) {
    if (!body.reason?.trim()) return res.status(400).json({ message: 'Rejection reason is required' });
    try {
      const inv = await this.finance.rejectInvoice(id, user.id, body.reason.trim());
      if (!inv) return res.status(404).json({ message: 'Invoice not found' });
      return res.json(inv);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post('invoices/:id/payments')
  @RequirePermission('finance:create')
  async recordPayment(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const result = await this.finance.recordPayment(id, body, user.id);
      if (!result) return res.status(404).json({ message: 'Invoice not found' });
      return res.status(201).json(result);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch('invoices/:invoiceId/payments/:paymentId')
  @RequirePermission('finance:edit')
  async editPayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string, @Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const result = await this.finance.editPayment(invoiceId, paymentId, body);
      if (!result) return res.status(404).json({ message: 'Payment not found' });
      return res.json(result);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Delete('invoices/:invoiceId/payments/:paymentId')
  @RequirePermission('finance:delete')
  async deletePayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string, @Res() res: Response) {
    try {
      const ok = await this.finance.deleteInvoicePayment(invoiceId, paymentId);
      if (!ok) return res.status(404).json({ message: 'Payment not found' });
      return res.json({ message: 'Payment deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
