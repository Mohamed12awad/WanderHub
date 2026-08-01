import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermission('projects:view')
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.projects.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('projects:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.findOne(id, user);
  }

  @Get(':id/invoices')
  @RequirePermission('projects:view')
  invoices(@Param('id') id: string) {
    return this.projects.getProjectInvoices(id);
  }

  @Get(':id/expenses')
  @RequirePermission('projects:view')
  expenses(@Param('id') id: string) {
    return this.projects.getProjectExpenses(id);
  }

  @Get(':id/tasks')
  @RequirePermission('projects:view')
  tasks(@Param('id') id: string) {
    return this.projects.getProjectTasks(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('projects:create')
  create(@Body() body: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projects.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('projects:edit')
  update(@Param('id') id: string, @Body() body: UpdateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projects.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('projects:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.remove(id, user);
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  @Get(':id/milestones')
  @RequirePermission('projects:view')
  getMilestones(@Param('id') id: string) {
    return this.projects.getMilestones(id);
  }

  @Post(':id/milestones')
  @HttpCode(201)
  @RequirePermission('projects:edit')
  createMilestone(@Param('id') id: string, @Body() body: CreateMilestoneDto, @CurrentUser() user: AuthUser) {
    return this.projects.createMilestone(id, body, user);
  }

  @Put(':id/milestones/:milestoneId')
  @RequirePermission('projects:edit')
  updateMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string, @Body() body: UpdateMilestoneDto, @CurrentUser() user: AuthUser) {
    return this.projects.updateMilestone(id, milestoneId, body, user);
  }

  @Delete(':id/milestones/:milestoneId')
  @HttpCode(204)
  @RequirePermission('projects:edit')
  deleteMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string, @CurrentUser() user: AuthUser) {
    return this.projects.deleteMilestone(id, milestoneId, user);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  @RequirePermission('projects:view')
  getMembers(@Param('id') id: string) {
    return this.projects.getMembers(id);
  }

  @Post(':id/members')
  @HttpCode(201)
  @RequirePermission('projects:edit')
  addMember(@Param('id') id: string, @Body() body: AddMemberDto, @CurrentUser() user: AuthUser) {
    return this.projects.addMember(id, body, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @RequirePermission('projects:edit')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    return this.projects.removeMember(id, userId, user);
  }
}
