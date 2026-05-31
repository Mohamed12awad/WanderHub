import { Controller, Delete, Get, HttpCode, NotFoundException, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.notifications.findAll(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const notif = await this.notifications.markRead(id, user.id);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const ok = await this.notifications.remove(id, user.id);
    if (!ok) throw new NotFoundException('Notification not found');
    return;
  }
}
