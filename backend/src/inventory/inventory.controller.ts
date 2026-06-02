import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

// Reuses the existing `products` permission resource so roles that can manage
// products can manage stock without introducing a new permission scope.
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
  movements(@Query('productId') productId?: string) {
    return this.inventory.movements(productId);
  }

  @Post(':productId/adjust')
  @RequirePermission('products:edit')
  adjust(
    @Param('productId') productId: string,
    @Body() body: { qty: number; note?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.adjust(productId, body, user.id);
  }

  @Patch(':productId/reorder-level')
  @RequirePermission('products:edit')
  setReorderLevel(@Param('productId') productId: string, @Body() body: { reorderLevel: number }) {
    return this.inventory.setReorderLevel(productId, body.reorderLevel);
  }
}
