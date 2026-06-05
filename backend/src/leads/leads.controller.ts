import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermission('leads:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.leads.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('leads:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leads.findOne(id, user);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('leads:create')
  create(@Body() body: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leads.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('leads:edit')
  update(@Param('id') id: string, @Body() body: UpdateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leads.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('leads:delete')
  remove(@Param('id') id: string) {
    return this.leads.remove(id);
  }

  @Post(':id/convert')
  @HttpCode(201)
  @RequirePermission('leads:edit')
  convert(@Param('id') id: string, @Body() body: { createDeal?: boolean }, @CurrentUser() user: AuthUser) {
    return this.leads.convertToCustomer(id, user.id, body?.createDeal ?? false);
  }
}
