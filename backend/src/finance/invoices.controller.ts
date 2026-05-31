import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { EditPaymentDto } from './dto/edit-payment.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InvoicesController {
  constructor(private readonly finance: FinanceService) {}

  @Get('payments')
  @RequirePermission('finance:view')
  getPayments(@Query() query: Record<string, string>) {
    return this.finance.getPayments(query);
  }

  @Get('invoices')
  @RequirePermission('finance:view')
  findAll(@Query() query: Record<string, string>) {
    return this.finance.getInvoices(query);
  }

  @Get('invoices/:id')
  @RequirePermission('finance:view')
  findOne(@Param('id') id: string) {
    return this.finance.getInvoiceById(id);
  }

  @Post('invoices')
  @HttpCode(201)
  @RequirePermission('finance:create')
  create(@Body() body: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.finance.createInvoice(body, user.id);
  }

  @Put('invoices/:id')
  @RequirePermission('finance:edit')
  update(@Param('id') id: string, @Body() body: UpdateInvoiceDto) {
    return this.finance.updateInvoice(id, body);
  }

  @Delete('invoices/:id')
  @HttpCode(204)
  @RequirePermission('finance:delete')
  remove(@Param('id') id: string) {
    return this.finance.deleteInvoice(id);
  }

  @Patch('invoices/:id/send')
  @RequirePermission('finance:edit')
  send(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.finance.sendInvoice(id, user.id);
  }

  @Patch('invoices/:id/approve')
  @RequirePermission('finance:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.finance.approveInvoice(id, user.id, user.role);
  }

  @Patch('invoices/:id/reject')
  @RequirePermission('finance:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.finance.rejectInvoice(id, user.id, body.reason.trim(), user.role);
  }

  @Post('invoices/:id/payments')
  @HttpCode(201)
  @RequirePermission('finance:create')
  recordPayment(@Param('id') id: string, @Body() body: RecordPaymentDto, @CurrentUser() user: AuthUser) {
    return this.finance.recordPayment(id, body, user.id);
  }

  @Patch('invoices/:invoiceId/payments/:paymentId')
  @RequirePermission('finance:edit')
  editPayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string, @Body() body: EditPaymentDto) {
    return this.finance.editPayment(invoiceId, paymentId, body);
  }

  @Delete('invoices/:invoiceId/payments/:paymentId')
  @HttpCode(204)
  @RequirePermission('finance:delete')
  deletePayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string) {
    return this.finance.deleteInvoicePayment(invoiceId, paymentId);
  }
}
