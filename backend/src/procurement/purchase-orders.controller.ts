import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { VendorBillsService } from './vendor-bills.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Controller('procurement/purchase-orders')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('purchaseOrders')
export class PurchaseOrdersController {
  constructor(
    private readonly pos: PurchaseOrdersService,
    private readonly bills: VendorBillsService,
  ) {}

  @Get()
  @RequirePermission('purchase-orders:view')
  findAll(@Query() query: Record<string, string>) {
    return this.pos.findAll(query);
  }

  @Get(':id')
  @RequirePermission('purchase-orders:view')
  findOne(@Param('id') id: string) {
    return this.pos.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('purchase-orders:create')
  create(@Body() body: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.pos.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('purchase-orders:edit')
  update(@Param('id') id: string, @Body() body: UpdatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.pos.update(id, body, user);
  }

  @Patch(':id/status')
  @RequirePermission('purchase-orders:edit')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: AuthUser) {
    if (!body.status) throw new BadRequestException('Status is required');
    return this.pos.updateStatus(id, body.status, user);
  }

  @Patch(':id/approve')
  @RequirePermission('purchase-orders:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pos.approve(id, user);
  }

  @Patch(':id/reject')
  @RequirePermission('purchase-orders:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.pos.reject(id, body.reason.trim(), user);
  }

  @Post(':id/receive')
  @HttpCode(200)
  @RequirePermission('purchase-orders:edit')
  // `lines` enables a partial receipt: [{ itemId, qty }]. Omit it to receive
  // everything still outstanding on the order (the previous behaviour).
  receive(
    @Param('id') id: string,
    @Body() body: { warehouseId?: string; lines?: { itemId: string; qty: number }[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.pos.receive(id, user, body?.warehouseId, body?.lines);
  }

  @Post(':id/create-bill')
  @HttpCode(201)
  @RequirePermission('vendor-bills:create')
  createBill(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bills.createFromPO(id, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('purchase-orders:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pos.remove(id, user);
  }
}
