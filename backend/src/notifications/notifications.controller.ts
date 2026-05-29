import {
  Controller, Delete, Get, Param, Put, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json(await this.notifications.findAll(user.id, query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json({ count: await this.notifications.unreadCount(user.id) }); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const notif = await this.notifications.markRead(id, user.id);
      if (!notif) return res.status(404).json({ message: 'Notification not found' });
      return res.json(notif);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put('read-all')
  async markAllRead(@CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json(await this.notifications.markAllRead(user.id)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const ok = await this.notifications.remove(id, user.id);
      if (!ok) return res.status(404).json({ message: 'Notification not found' });
      return res.json({ message: 'Notification deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
