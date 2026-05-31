import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermission('products:view')
  findAll(@Query() query: Record<string, string>) {
    return this.products.findAll(query);
  }

  @Get(':id')
  @RequirePermission('products:view')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('products:create')
  create(@Body() body: CreateProductDto) {
    return this.products.create(body);
  }

  @Put(':id')
  @RequirePermission('products:edit')
  update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('products:delete')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
