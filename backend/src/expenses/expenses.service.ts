import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, approved, createdAt_from, createdAt_to } = query;
    const baseInclude = { user: { select: { id: true, name: true } }, expenses: true };
    if (!page) {
      const reports = await this.prisma.expenseReport.findMany({ include: baseInclude, orderBy: { createdAt: 'desc' } });
      return toClient(reports);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = {};
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (approved !== undefined && approved !== '') where.approved = approved === 'true';
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) where.AND = [...(where.AND ?? []), ...cfConditions];
    const [data, total] = await Promise.all([
      this.prisma.expenseReport.findMany({ where, include: baseInclude, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.expenseReport.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.prisma.expenseReport.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return report ? toClient(report) : null;
  }

  async create(body: Record<string, any>, userId: string) {
    const { title, expenses } = body as { title: string; expenses: any[] };
    const report = await this.prisma.expenseReport.create({
      data: {
        title,
        userId,
        expenses: {
          create: (expenses ?? []).map((e: any) => ({
            description: e.description,
            amount: Number(e.amount),
            date: new Date(e.date),
            category: e.category,
            beneficiary: e.beneficiary,
          })),
        },
      },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return toClient(report);
  }

  async update(id: string, body: Record<string, any>) {
    const existing = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!existing) return null;
    const { expenses, userId, _id, id: _id2, createdAt, updatedAt, user, ...rest } = body;
    // Replace expense items entirely if provided
    const data: any = { ...rest };
    if (expenses) {
      await this.prisma.expenseItem.deleteMany({ where: { expenseReportId: id } });
      data.expenses = {
        create: expenses.map((e: any) => ({
          description: e.description,
          amount: Number(e.amount),
          date: new Date(e.date),
          category: e.category,
          beneficiary: e.beneficiary,
        })),
      };
    }
    const report = await this.prisma.expenseReport.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return toClient(report);
  }

  async approve(id: string, userId: string) {
    const report = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!report) return null;
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'approved', approved: true, approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return toClient(updated);
  }

  async reject(id: string, userId: string, reason: string) {
    const report = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!report) return null;
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'rejected', approved: false, approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return toClient(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!existing) return null;
    await this.prisma.expenseReport.delete({ where: { id } });
    return true;
  }
}
