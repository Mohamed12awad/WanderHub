import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermission('tasks:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.tasks.findAll(query, user);
  }

  @Get('summary')
  @RequirePermission('tasks:view')
  summary() {
    return this.tasks.summary();
  }

  @Get(':id')
  @RequirePermission('tasks:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.findOne(id, user);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('tasks:create')
  create(@Body() body: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasks.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('tasks:edit')
  update(@Param('id') id: string, @Body() body: UpdateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasks.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('tasks:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.remove(id, user);
  }

  @Patch(':id/complete')
  @RequirePermission('tasks:edit')
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.complete(id, user);
  }
}
