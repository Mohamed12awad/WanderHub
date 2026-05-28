import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { RolesService } from './roles.service';
import { handlePrismaError } from '../common/prisma-error';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles:view')
  async findAll(@Res() res: Response) {
    try { return res.json(await this.roles.findAll()); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('roles:manage')
  async create(@Body() body: { name: string; permissions: string[] }, @Res() res: Response) {
    try { return res.status(201).json(await this.roles.create(body.name, body.permissions)); }
    catch (e) { return handlePrismaError(e, res); }
  }

  @Put(':id')
  @RequirePermission('roles:manage')
  async update(@Param('id') id: string, @Body() body: { permissions: string[] }, @Res() res: Response) {
    try {
      const result = await this.roles.update(id, body.permissions);
      if (!result) return res.status(404).json({ message: 'Role not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'Cannot modify protected roles' });
      return res.json(result);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('roles:manage')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.roles.remove(id);
      if (!result) return res.status(404).json({ message: 'Role not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'Cannot delete protected roles' });
      return res.json({ message: 'Role deleted' });
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
