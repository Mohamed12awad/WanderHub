import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('users:view')
  findAll(@Query() query: Record<string, string>) {
    return this.users.findAll(query);
  }

  @Get(':id')
  @RequirePermission('users:view')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('users:create')
  create(@Body() body: CreateUserDto) {
    return this.users.create(body);
  }

  @Put(':id')
  @RequirePermission('users:edit')
  update(@Param('id') id: string, @Body() body: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.users.update(id, body, user.role);
  }

  @Patch(':id/toggle-active')
  @RequirePermission('users:edit')
  toggleActive(@Param('id') id: string) {
    return this.users.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('users:delete')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
