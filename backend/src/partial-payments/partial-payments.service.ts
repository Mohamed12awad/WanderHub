import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';

@Injectable()
export class PartialPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  async findByDeal(dealId: string) {
    const payments = await this.prisma.partialPayment.findMany({ where: { dealId } });
    return { partialPayments: toClient(payments) };
  }

  async findOne(id: string) {
    const payment = await this.prisma.partialPayment.findUnique({ where: { id } });
    return payment ? { partialPayment: toClient(payment) } : null;
  }

  async create(body: Record<string, any>, userId: string) {
    const { booking, amount, ...rest } = body;
    const deal = await this.prisma.deal.findUnique({ where: { id: booking } });
    if (!deal) return { notFound: true };
    const existingSum = await this.prisma.partialPayment.aggregate({
      where: { dealId: booking },
      _sum: { amount: true },
    });
    const currentTotal = existingSum._sum.amount ?? 0;
    if (currentTotal + Number(amount) > deal.price) return { overPayment: true };

    const payment = await this.prisma.partialPayment.create({
      data: { ...rest, dealId: booking, amount: Number(amount), date: new Date(body.date ?? Date.now()), createdById: userId },
    });

    await this.timeline.log(
      'payment.received',
      `Payment of ${payment.amount} ${payment.currency} received`,
      booking,
      'Deal',
      { amount: payment.amount, currency: payment.currency, method: payment.method },
      userId,
    );

    return { partialPayment: toClient(payment) };
  }

  async update(id: string, body: Record<string, any>) {
    const existing = await this.prisma.partialPayment.findUnique({ where: { id } });
    if (!existing) return null;
    const { _id, id: _id2, createdAt, updatedAt, booking, deal, createdBy, ...data } = body;
    const payment = await this.prisma.partialPayment.update({ where: { id }, data });
    return { partialPayment: toClient(payment) };
  }

  async remove(id: string, userId: string) {
    const payment = await this.prisma.partialPayment.findUnique({ where: { id } });
    if (!payment) return null;

    await this.prisma.partialPayment.delete({ where: { id } });

    await this.timeline.log(
      'payment.deleted',
      `Payment of ${payment.amount} ${payment.currency} removed`,
      payment.dealId,
      'Deal',
      { amount: payment.amount, currency: payment.currency },
      userId,
    );

    return true;
  }
}
