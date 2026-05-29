import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermission('tasks:view')
  async findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json(await this.tasks.findAll({ ...query, _userId: user.id })); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('summary')
  @RequirePermission('tasks:view')
  async summary(@Res() res: Response) {
    try { return res.json(await this.tasks.summary()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('tasks:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const t = await this.tasks.findOne(id);
      if (!t) return res.status(404).json({ message: 'Task not found' });
      return res.json(t);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('tasks:create')
  async create(@Body() body: CreateTaskDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.tasks.create(body, user.id)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('tasks:edit')
  async update(@Param('id') id: string, @Body() body: UpdateTaskDto, @Res() res: Response) {
    try {
      const t = await this.tasks.update(id, body);
      if (!t) return res.status(404).json({ message: 'Task not found' });
      return res.json(t);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('tasks:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.tasks.remove(id);
      if (!ok) return res.status(404).json({ message: 'Task not found' });
      return res.json({ message: 'Task deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch(':id/complete')
  @RequirePermission('tasks:edit')
  async complete(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const t = await this.tasks.complete(id, user.id);
      if (!t) return res.status(404).json({ message: 'Task not found' });
      return res.json(t);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
