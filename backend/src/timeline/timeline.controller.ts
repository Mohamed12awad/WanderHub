import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedAccessService } from '../common/linked-access.service';
import { toClient } from '../common/serialize';

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly linkedAccess: LinkedAccessService,
  ) {}

  @Get()
  async getTimeline(
    @Query('linkedTo') linkedTo: string,
    @Query('linkedModel') linkedModel: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!linkedTo || !linkedModel) throw new BadRequestException('linkedTo and linkedModel are required');
    await this.linkedAccess.assertCanAccess(user, linkedModel, linkedTo);

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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60);

    return toClient(merged);
  }
}
