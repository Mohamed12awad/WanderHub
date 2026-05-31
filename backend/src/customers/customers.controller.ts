import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission('contacts:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.customers.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('contacts:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.customers.findOne(id, user);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('contacts:create')
  create(@Body() body: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customers.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('contacts:edit')
  update(@Param('id') id: string, @Body() body: UpdateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customers.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('contacts:delete')
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
