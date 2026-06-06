import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    const notif = await this.prisma.notification.create({ data: dto as Prisma.NotificationUncheckedCreateInput });
    return toClient(notif);
  }

  async findAll(userId: string, query: Record<string, string>) {
    const { page, limit: limitRaw, unread } = query;
    const where: Prisma.NotificationWhereInput = { userId };
    if (unread === 'true') where.read = false;

    if (!page) {
      const notifications = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const unreadCount = await this.prisma.notification.count({ where: { userId, read: false } });
      return { data: toClient(notifications), unreadCount };
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit), unreadCount };
  }

  async markRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('notification not found');
    const updated = await this.prisma.notification.update({ where: { id }, data: { read: true } });
    return toClient(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { success: true };
  }

  async remove(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('notification not found');
    await this.prisma.notification.delete({ where: { id } });
    return true;
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}
