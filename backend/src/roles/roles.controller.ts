import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles:view')
  findAll() {
    return this.roles.findAll();
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('roles:manage')
  create(@Body() body: { name: string; permissions: string[] }) {
    return this.roles.create(body.name, body.permissions);
  }

  @Put(':id')
  @RequirePermission('roles:manage')
  update(@Param('id') id: string, @Body() body: { permissions: string[] }) {
    return this.roles.update(id, body.permissions);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('roles:manage')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }
}
