import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { handlePrismaError } from '../common/prisma-error';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('users:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.users.findAll(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('users:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const user = await this.users.findOne(id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json(user);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('users:create')
  async create(@Body() body: CreateUserDto, @Res() res: Response) {
    try { return res.status(201).json(await this.users.create(body)); }
    catch (e) { return handlePrismaError(e, res); }
  }

  @Put(':id')
  @RequirePermission('users:edit')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    try {
      const result = await this.users.update(id, body, user.role);
      if (!result) return res.status(404).json({ message: 'User not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'Access denied. Super admin only.' });
      return res.json(result);
    } catch (e) { return handlePrismaError(e, res); }
  }

  @Patch(':id/toggle-active')
  @RequirePermission('users:edit')
  async toggleActive(@Param('id') id: string, @Res() res: Response) {
    try {
      const user = await this.users.toggleActive(id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json(user);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('users:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.users.remove(id);
      if (!result) return res.status(404).json({ message: 'User not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'Cannot delete super admin' });
      return res.json({ message: 'User deleted successfully' });
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
