import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getTimeline(
    @Query('linkedTo') linkedTo: string,
    @Query('linkedModel') linkedModel: string,
    @Res() res: Response,
  ) {
    if (!linkedTo || !linkedModel) {
      return res
        .status(400)
        .json({ message: 'linkedTo and linkedModel are required' });
    }

    try {
      const [events, activities] = await Promise.all([
        this.prisma.timelineEvent.findMany({
          where: { linkedToId: linkedTo, linkedModel },
          include: { triggeredBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        this.prisma.activity.findMany({
          where: { linkedToId: linkedTo, linkedModel },
          include: {
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
          take: 100,
        }),
      ]);

      const merged = [
        ...events.map((e) => ({ ...e, _sourceType: 'timeline' as const })),
        ...activities.map((a) => ({
          ...a,
          _sourceType: 'activity' as const,
          createdAt: a.date,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 60);

      return res.json(toClient(merged));
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }
}
