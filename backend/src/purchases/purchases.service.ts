import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const purchases = await this.prisma.purchase.findMany({ orderBy: { date: 'desc' } });
    return toClient(purchases);
  }

  async create(body: Record<string, any>) {
    const { _id, id, createdAt, updatedAt, ...rest } = body;
    const price = Number(rest.price ?? 0);
    const shippingCost = Number(rest.shippingCost ?? 0);
    const tax = Number(rest.tax ?? 0);
    const insurance = Number(rest.insurance ?? 0);
    const otherCosts = Number(rest.otherCosts ?? 0);
    const landedCost = price + shippingCost + tax + insurance + otherCosts;
    const purchase = await this.prisma.purchase.create({
      data: { ...rest, price, shippingCost, tax, insurance, otherCosts, landedCost, date: new Date(rest.date) } as any,
    });
    return toClient(purchase);
  }
}
