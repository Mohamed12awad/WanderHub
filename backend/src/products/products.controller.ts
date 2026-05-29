import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.products.findAll(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('products:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const p = await this.products.findOne(id);
      if (!p) return res.status(404).json({ message: 'Product not found' });
      return res.json(p);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('products:create')
  async create(@Body() body: CreateProductDto, @Res() res: Response) {
    try { return res.status(201).json(await this.products.create(body)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('products:edit')
  async update(@Param('id') id: string, @Body() body: UpdateProductDto, @Res() res: Response) {
    try {
      const p = await this.products.update(id, body);
      if (!p) return res.status(404).json({ message: 'Product not found' });
      return res.json(p);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.products.remove(id);
      if (!ok) return res.status(404).json({ message: 'Product not found' });
      return res.status(204).end();
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
