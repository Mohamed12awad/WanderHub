import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('procurement/suppliers')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermission('suppliers:view')
  findAll(@Query() query: Record<string, string>) {
    return this.suppliers.findAll(query);
  }

  @Get(':id')
  @RequirePermission('suppliers:view')
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('suppliers:create')
  create(@Body() body: CreateSupplierDto) {
    return this.suppliers.create(body);
  }

  @Put(':id')
  @RequirePermission('suppliers:edit')
  update(@Param('id') id: string, @Body() body: UpdateSupplierDto) {
    return this.suppliers.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('suppliers:delete')
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id);
  }
}
