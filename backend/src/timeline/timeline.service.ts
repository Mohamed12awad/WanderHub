import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a timeline event. Side-effect only — never throws into the request.
   * Mirrors the legacy `logTimeline` signature.
   */
  async log(
    eventType: string,
    title: string,
    linkedTo: string,
    linkedModel: 'Customer' | 'Deal',
    payload?: Record<string, unknown>,
    triggeredBy?: string,
  ): Promise<void> {
    try {
      await this.prisma.timelineEvent.create({
        data: {
          eventType,
          title,
          linkedToId: linkedTo,
          linkedModel,
          payload: (payload ?? undefined) as any,
          ...(linkedModel === 'Customer' ? { customerId: linkedTo } : {}),
          ...(linkedModel === 'Deal' ? { dealId: linkedTo } : {}),
          triggeredById: triggeredBy || undefined,
          isSystem: !triggeredBy,
        },
      });
    } catch (err) {
      console.error('[TimelineService] Failed to log event:', err);
    }
  }
}
