import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductCategoriesController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @RequirePermission('product-categories:view')
  findAll(@Query() query: Record<string, string>) {
    return this.categories.findAll(query);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('product-categories:manage')
  create(@Body() body: { name: string; code?: string | null; costMethod?: string | null; parentId?: string | null }) {
    return this.categories.create(body);
  }

  @Patch(':id')
  @RequirePermission('product-categories:manage')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('product-categories:manage')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
