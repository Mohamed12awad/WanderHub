import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { SendEmailDto } from './dto/send-email.dto';
import { bodyToHtml, instrumentEmail } from './tracking.util';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  /** Records a tracked email and enqueues the instrumented HTML for delivery. */
  async send(dto: SendEmailDto, user: AuthUser) {
    const tracked = await this.prisma.trackedEmail.create({
      data: {
        to: dto.to,
        subject: dto.subject,
        linkedToId: dto.linkedToId ?? null,
        linkedModel: dto.linkedModel ?? null,
        createdById: user.id,
      },
    });

    const baseUrl = process.env.PUBLIC_API_URL ?? process.env.APP_URL ?? '';
    const html = instrumentEmail({
      trackId: tracked.id,
      baseUrl,
      subject: dto.subject,
      bodyHtml: bodyToHtml(dto.body),
    });

    // Reuse the durable outbox + scheduler for actual delivery.
    const outbox = await this.prisma.emailOutbox.create({
      data: { to: dto.to, subject: dto.subject, html },
    });
    await this.prisma.trackedEmail.update({
      where: { id: tracked.id },
      data: { outboxId: outbox.id, status: 'queued' },
    });

    if (dto.linkedToId && dto.linkedModel) {
      await this.timeline.log(
        'email.sent',
        `Email sent: ${dto.subject}`,
        dto.linkedToId,
        dto.linkedModel as 'Customer' | 'Deal' | 'Lead',
        { to: dto.to },
        user.id,
      );
    }

    return tracked;
  }

  /** Tracked emails for a record, with delivery status reconciled from the outbox. */
  async list(linkedToId: string, linkedModel: string) {
    const emails = await this.prisma.trackedEmail.findMany({
      where: { linkedToId, linkedModel },
      orderBy: { createdAt: 'desc' },
    });
    const outboxIds = emails.map((e) => e.outboxId).filter(Boolean) as string[];
    const outboxes = outboxIds.length
      ? await this.prisma.emailOutbox.findMany({
          where: { id: { in: outboxIds } },
          select: { id: true, status: true, sentAt: true },
        })
      : [];
    const map = new Map(outboxes.map((o) => [o.id, o]));
    return emails.map((e) => ({
      ...e,
      deliveryStatus: e.outboxId ? map.get(e.outboxId)?.status ?? 'queued' : 'queued',
      sentAt: e.outboxId ? map.get(e.outboxId)?.sentAt ?? null : null,
    }));
  }
}
