import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { EditPaymentDto } from './dto/edit-payment.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('payments')
  @RequirePermission('invoices:view')
  getPayments(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.invoices.getPayments(query, user);
  }

  @Get('invoices')
  @RequirePermission('invoices:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.invoices.getInvoices(query, user);
  }

  @Get('invoices/:id')
  @RequirePermission('invoices:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.getInvoiceById(id, user);
  }

  @Post('invoices')
  @HttpCode(201)
  @RequirePermission('invoices:create')
  create(@Body() body: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.createInvoice(body, user.id);
  }

  @Put('invoices/:id')
  @RequirePermission('invoices:edit')
  update(@Param('id') id: string, @Body() body: UpdateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.updateInvoice(id, body, user);
  }

  @Delete('invoices/:id')
  @HttpCode(204)
  @RequirePermission('invoices:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.deleteInvoice(id, user);
  }

  @Patch('invoices/:id/send')
  @RequirePermission('invoices:edit')
  send(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.sendInvoice(id, user.id);
  }

  @Patch('invoices/:id/approve')
  @RequirePermission('invoices:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.approveInvoice(id, user.id, user.role, user.permissions);
  }

  @Patch('invoices/:id/reject')
  @RequirePermission('invoices:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.invoices.rejectInvoice(id, user.id, body.reason.trim(), user.role, user.permissions);
  }

  @Post('invoices/:id/payments')
  @HttpCode(201)
  @RequirePermission('invoices:create')
  recordPayment(@Param('id') id: string, @Body() body: RecordPaymentDto, @CurrentUser() user: AuthUser) {
    return this.invoices.recordPayment(id, body, user);
  }

  @Patch('invoices/:invoiceId/payments/:paymentId')
  @RequirePermission('invoices:edit')
  editPayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string, @Body() body: EditPaymentDto, @CurrentUser() user: AuthUser) {
    return this.invoices.editPayment(invoiceId, paymentId, body, user);
  }

  @Delete('invoices/:invoiceId/payments/:paymentId')
  @HttpCode(204)
  @RequirePermission('invoices:delete')
  deletePayment(@Param('invoiceId') invoiceId: string, @Param('paymentId') paymentId: string, @CurrentUser() user: AuthUser) {
    return this.invoices.deleteInvoicePayment(invoiceId, paymentId, user);
  }
}
