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

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.activities.create(body, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateActivityDto) {
    return this.activities.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.activities.remove(id);
  }
}
