import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission('products:view')
  list() {
    return this.inventory.list();
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

  @Post(':productId/adjust')
  @RequirePermission('products:edit')
  adjust(
    @Param('productId') productId: string,
    @Body() body: { qty: number; note?: string; reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.adjust(productId, body, user.id);
  }

  @Patch(':productId/details')
  @RequirePermission('products:edit')
  updateDetails(
    @Param('productId') productId: string,
    @Body() body: { reorderLevel?: number; location?: string },
  ) {
    return this.inventory.updateDetails(productId, body);
  }

  @Patch(':productId/reorder-level')
  @RequirePermission('products:edit')
  setReorderLevel(@Param('productId') productId: string, @Body() body: { reorderLevel: number }) {
    return this.inventory.setReorderLevel(productId, body.reorderLevel);
  }
}
