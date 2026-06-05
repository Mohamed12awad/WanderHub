import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermission('deals:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.deals.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('deals:view')
  findOne(@Param('id') id: string, @Query('includePayments') includePayments: string, @CurrentUser() user: AuthUser) {
    return this.deals.findOne(id, includePayments === 'true', user);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('deals:create')
  create(@Body() body: CreateDealDto, @CurrentUser() user: AuthUser) {
    return this.deals.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('deals:edit')
  update(@Param('id') id: string, @Body() body: UpdateDealDto, @CurrentUser() user: AuthUser) {
    return this.deals.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('deals:delete')
  remove(@Param('id') id: string) {
    return this.deals.remove(id);
  }

  @Post(':id/create-quote')
  @HttpCode(201)
  @RequirePermission('quotes:create')
  createQuote(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.deals.createQuoteFromDeal(id, user.id);
  }
}
