import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { VendorBillsService } from './vendor-bills.service';
import { CreateVendorBillDto } from './dto/create-vendor-bill.dto';
import { UpdateVendorBillDto } from './dto/update-vendor-bill.dto';
import { RecordBillPaymentDto } from './dto/record-bill-payment.dto';

@Controller('procurement/vendor-bills')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VendorBillsController {
  constructor(private readonly bills: VendorBillsService) {}

  @Get()
  @RequirePermission('procurement:view')
  findAll(@Query() query: Record<string, string>) {
    return this.bills.findAll(query);
  }

  @Get('vendor-payments')
  @RequirePermission('procurement:view')
  getVendorPayments(@Query() query: Record<string, string>) {
    return this.bills.getVendorPayments(query);
  }

  @Get(':id')
  @RequirePermission('procurement:view')
  findOne(@Param('id') id: string) {
    return this.bills.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('procurement:create')
  create(@Body() body: CreateVendorBillDto, @CurrentUser() user: AuthUser) {
    return this.bills.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('procurement:edit')
  update(@Param('id') id: string, @Body() body: UpdateVendorBillDto, @CurrentUser() user: AuthUser) {
    return this.bills.update(id, body, user.id);
  }

  @Patch(':id/approve')
  @RequirePermission('procurement:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bills.approve(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @RequirePermission('procurement:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.bills.reject(id, user.id, user.role, body.reason.trim());
  }

  @Post(':id/payments')
  @HttpCode(201)
  @RequirePermission('procurement:edit')
  recordPayment(@Param('id') id: string, @Body() body: RecordBillPaymentDto, @CurrentUser() user: AuthUser) {
    return this.bills.recordPayment(id, body, user.id);
  }

  @Delete(':billId/payments/:paymentId')
  @HttpCode(204)
  @RequirePermission('procurement:edit')
  deletePayment(@Param('billId') billId: string, @Param('paymentId') paymentId: string) {
    return this.bills.deletePayment(billId, paymentId);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('procurement:delete')
  remove(@Param('id') id: string) {
    return this.bills.remove(id);
  }
}
