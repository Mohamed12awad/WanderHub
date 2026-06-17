import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { MoneyAsString } from '../common/money-as-string.decorator';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission('products:view')
  list(@Query() query: Record<string, string>) {
    return this.inventory.list(query);
  }

  @Get('valuation')
  @MoneyAsString()
  @RequirePermission('products:view')
  valuation(@Query() query: Record<string, string>) {
    return this.inventory.valuation(query);
  }

  @Get('low-stock')
  @RequirePermission('products:view')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get('movements')
  @RequirePermission('products:view')
  movements(
    @Query('productId') productId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.inventory.movements(productId, skip ? parseInt(skip, 10) : 0, take ? parseInt(take, 10) : 50);
  }

  @Post('returns')
  @RequirePermission('products:edit')
  returnStock(
    @Body() body: { movementId: string; qty: number; note?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.returnStock(body, user.id);
  }

  @Post('transfers')
  @RequirePermission('products:edit')
  transfer(
    @Body() body: { productId: string; fromWarehouseId: string; toWarehouseId: string; qty: number; note?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.transfer(body, user.id);
  }

  @Post(':productId/adjust')
  @RequirePermission('products:edit')
  adjust(
    @Param('productId') productId: string,
    @Body() body: { qty: number; note?: string; reason?: string; warehouseId?: string; unitCost?: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.adjust(productId, body, user.id);
  }

  @Patch(':productId/details')
  @RequirePermission('products:edit')
  updateDetails(
    @Param('productId') productId: string,
    @Body() body: { reorderLevel?: number; location?: string; warehouseId?: string },
  ) {
    return this.inventory.updateDetails(productId, body);
  }

  @Patch(':productId/reorder-level')
  @RequirePermission('products:edit')
  setReorderLevel(
    @Param('productId') productId: string,
    @Body() body: { reorderLevel: number; warehouseId?: string },
  ) {
    return this.inventory.setReorderLevel(productId, body.reorderLevel, body.warehouseId);
  }
}
