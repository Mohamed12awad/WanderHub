import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
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

  // ── Self-service "me" routes — must come before ":id" ────────────────────────

  @Post('me/change-password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.users.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Get('me/sessions')
  getSessions(@CurrentUser() user: AuthUser) {
    return this.users.getSessions(user.id);
  }

  @Delete('me/sessions/:sessionId')
  @HttpCode(200)
  revokeSession(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.users.revokeSession(user.id, sessionId);
  }

  @Get('me/login-history')
  getLoginHistory(@CurrentUser() user: AuthUser) {
    return this.users.getLoginHistory(user.id);
  }

  @Get('me/notification-preferences')
  getNotificationPreferences(@CurrentUser() user: AuthUser) {
    return this.users.getNotificationPreferences(user.id);
  }

  @Put('me/notification-preferences')
  updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, { inApp: boolean; email: boolean }>,
  ) {
    return this.users.updateNotificationPreferences(user.id, body);
  }

  @Put('me/landing-page')
  updateLandingPage(
    @CurrentUser() user: AuthUser,
    @Body() body: { defaultLandingPage: string | null },
  ) {
    return this.users.updateLandingPage(user.id, body?.defaultLandingPage ?? null);
  }

  @Put('me/onboarded')
  markOnboarded(@CurrentUser() user: AuthUser) {
    return this.users.markOnboarded(user.id);
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────────

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
