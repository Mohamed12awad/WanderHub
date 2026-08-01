import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

@Controller('sales-orders')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('salesOrders')
export class SalesOrdersController {
  constructor(private readonly salesOrders: SalesOrdersService) {}

  @Get()
  @RequirePermission('sales-orders:view')
  findAll(@Query() query: Record<string, string>) {
    return this.salesOrders.getAll(query);
  }

  @Get(':id')
  @RequirePermission('sales-orders:view')
  findOne(@Param('id') id: string) {
    return this.salesOrders.getById(id);
  }

  // Read-only PO prefill for items the SO can't fulfil from stock. Creates
  // nothing — the frontend opens the PO form with this data.
  @Get(':id/purchase-order-prefill')
  @RequirePermission('sales-orders:view')
  purchaseOrderPrefill(@Param('id') id: string) {
    return this.salesOrders.getPurchaseOrderPrefill(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('sales-orders:create')
  create(@Body() body: CreateSalesOrderDto, @CurrentUser() user: AuthUser) {
    return this.salesOrders.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('sales-orders:edit')
  update(@Param('id') id: string, @Body() body: UpdateSalesOrderDto, @CurrentUser() user: AuthUser) {
    return this.salesOrders.update(id, body, user);
  }

  @Patch(':id/status')
  @RequirePermission('sales-orders:edit')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: AuthUser) {
    if (!body.status) throw new BadRequestException('status is required');
    return this.salesOrders.updateStatus(id, body.status, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('sales-orders:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesOrders.remove(id, user);
  }

  @Patch(':id/approve')
  @RequirePermission('sales-orders:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesOrders.approve(id, user);
  }

  @Patch(':id/reject')
  @RequirePermission('sales-orders:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.salesOrders.reject(id, body.reason.trim(), user);
  }

  @Post(':id/create-invoice')
  @HttpCode(201)
  @RequirePermission('invoices:create')
  createInvoice(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesOrders.convertToInvoice(id, user);
  }
}
