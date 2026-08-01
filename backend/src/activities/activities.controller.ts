import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('calendar')
@RequirePermission('activities:view')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.activities.findAll(query);
  }

  // Audit 2026-08 (P0): these three routes inherited the class-level
  // `activities:view`, so a read-only role could create, edit and delete
  // activities. Each mutation now requires its own permission.
  @Post()
  @HttpCode(201)
  @RequirePermission('activities:create')
  create(@Body() body: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.activities.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('activities:edit')
  update(@Param('id') id: string, @Body() body: UpdateActivityDto) {
    return this.activities.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('activities:delete')
  remove(@Param('id') id: string) {
    return this.activities.remove(id);
  }
}
