import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SummeryService {
  constructor(private readonly prisma: PrismaService) {}

  private async getRevenue(start: Date, end: Date) {
    const rows = await this.prisma.deal.groupBy({
      by: ['currency'],
      where: { deletedAt: null, createdAt: { gte: start, lte: end }, NOT: { status: 'cancelled' } },
      _sum: { price: true },
    });
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = r._sum.price ?? 0;
      return acc;
    }, {});
  }

  private async getNewCustomers(start: Date, end: Date) {
    return this.prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: start, lte: end } } });
  }

  private async getUnderCollection(start: Date, end: Date) {
    const rows = await this.prisma.deal.groupBy({
      by: ['currency'],
      where: { deletedAt: null, createdAt: { gte: start, lte: end }, NOT: { status: 'cancelled' } },
      _sum: { price: true, totalPaid: true },
    });
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (r._sum.price ?? 0) - (r._sum.totalPaid ?? 0);
      return acc;
    }, {});
  }

  private async getExpenses(start: Date, end: Date) {
    const [totalAgg, catRows] = await Promise.all([
      this.prisma.expenseItem.aggregate({
        _sum: { amount: true },
        where: { expenseReport: { approved: true, deletedAt: null, createdAt: { gte: start, lte: end } } },
      }),
      this.prisma.expenseItem.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { date: { gte: start, lte: end } },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);
    const categories = catRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = r._sum.amount ?? 0;
      return acc;
    }, {});
    return { total: totalAgg._sum.amount ?? 0, categories };
  }

  async getSummery(timePeriod?: string) {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (timePeriod) {
      case 'week': {
        currentStart = new Date(now); currentStart.setDate(now.getDate() - 7);
        currentEnd = new Date(now);
        previousStart = new Date(now); previousStart.setDate(now.getDate() - 14);
        previousEnd = new Date(currentStart);
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        currentStart = new Date(now.getFullYear(), (q - 1) * 3, 1);
        currentEnd = new Date(now.getFullYear(), q * 3, 0);
        previousStart = new Date(now.getFullYear(), (q - 2) * 3, 1);
        previousEnd = new Date(now.getFullYear(), (q - 1) * 3, 0);
        break;
      }
      default: {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      }
    }

    const [
      currentRevenue, previousRevenue,
      currentNewCustomers, previousNewCustomers,
      currentUnderCollection, previousUnderCollection,
      currentExpenses, previousExpenses,
    ] = await Promise.all([
      this.getRevenue(currentStart, currentEnd),
      this.getRevenue(previousStart, previousEnd),
      this.getNewCustomers(currentStart, currentEnd),
      this.getNewCustomers(previousStart, previousEnd),
      this.getUnderCollection(currentStart, currentEnd),
      this.getUnderCollection(previousStart, previousEnd),
      this.getExpenses(currentStart, currentEnd),
      this.getExpenses(previousStart, previousEnd),
    ]);

    return {
      currentPeriod: { startDate: currentStart, endDate: currentEnd, revenue: currentRevenue, newCustomers: currentNewCustomers, underCollection: currentUnderCollection, expenses: currentExpenses },
      previousPeriod: { startDate: previousStart, endDate: previousEnd, revenue: previousRevenue, newCustomers: previousNewCustomers, underCollection: previousUnderCollection, expenses: previousExpenses },
    };
  }
}
