import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a timeline event. Side-effect only — never throws into the request.
   * Mirrors the legacy `logTimeline` signature.
   */
  async log(
    eventType: string,
    title: string,
    linkedTo: string,
    linkedModel: 'Customer' | 'Deal' | 'Quote' | 'Invoice' | 'Expense' | 'Product' | 'Task' | 'PurchaseOrder' | 'VendorBill' | 'Project' | 'Lead' | 'Supplier' | 'SalesOrder',
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
          ...(linkedModel === 'Project' ? { projectId: linkedTo } : {}),
          triggeredById: triggeredBy || undefined,
          isSystem: !triggeredBy,
        },
      });
    } catch (err) {
      this.logger.error({ err }, 'Failed to log timeline event');
    }
  }
}
