import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @RequirePermission('warehouses:view')
  findAll(@Query() query: Record<string, string>) {
    return this.warehouses.findAll(query);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('warehouses:manage')
  create(@Body() body: { name: string; code: string; address?: unknown; isDefault?: boolean; isActive?: boolean }) {
    return this.warehouses.create(body);
  }

  @Patch(':id')
  @RequirePermission('warehouses:manage')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.warehouses.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('warehouses:manage')
  remove(@Param('id') id: string) {
    return this.warehouses.remove(id);
  }
}
