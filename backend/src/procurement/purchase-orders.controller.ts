import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { VendorBillsService } from './vendor-bills.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Controller('procurement/purchase-orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly pos: PurchaseOrdersService,
    private readonly bills: VendorBillsService,
  ) {}

  @Get()
  @RequirePermission('procurement:view')
  findAll(@Query() query: Record<string, string>) {
    return this.pos.findAll(query);
  }

  @Get(':id')
  @RequirePermission('procurement:view')
  findOne(@Param('id') id: string) {
    return this.pos.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('procurement:create')
  create(@Body() body: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.pos.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('procurement:edit')
  update(@Param('id') id: string, @Body() body: UpdatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.pos.update(id, body, user.id);
  }

  @Patch(':id/status')
  @RequirePermission('procurement:edit')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: AuthUser) {
    if (!body.status) throw new BadRequestException('Status is required');
    return this.pos.updateStatus(id, body.status, user.id);
  }

  @Patch(':id/approve')
  @RequirePermission('procurement:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pos.approve(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @RequirePermission('procurement:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.pos.reject(id, user.id, user.role, body.reason.trim());
  }

  @Post(':id/create-bill')
  @HttpCode(201)
  @RequirePermission('procurement:create')
  createBill(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bills.createFromPO(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('procurement:delete')
  remove(@Param('id') id: string) {
    return this.pos.remove(id);
  }
}
