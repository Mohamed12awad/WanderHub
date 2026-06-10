import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from './visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

interface ModelConfig {
  resource: string;
  ownerField: string;
  prismaModel: string;
}

const MODEL_CONFIG: Record<string, ModelConfig> = {
  Customer:      { resource: 'contacts',   ownerField: 'ownerId',      prismaModel: 'customer' },
  Deal:          { resource: 'deals',       ownerField: 'ownerId',      prismaModel: 'deal' },
  Lead:          { resource: 'leads',       ownerField: 'ownerId',      prismaModel: 'lead' },
  Invoice:       { resource: 'finance',     ownerField: 'createdById',  prismaModel: 'invoice' },
  Quote:         { resource: 'quotes',      ownerField: 'createdById',  prismaModel: 'quote' },
  SalesOrder:    { resource: 'sales',       ownerField: 'createdById',  prismaModel: 'salesOrder' },
  PurchaseOrder: { resource: 'procurement', ownerField: 'createdById',  prismaModel: 'purchaseOrder' },
  VendorBill:    { resource: 'procurement', ownerField: 'createdById',  prismaModel: 'vendorBill' },
  Project:       { resource: 'projects',    ownerField: 'managerId',    prismaModel: 'project' },
  Task:          { resource: 'tasks',       ownerField: 'assignedToId', prismaModel: 'task' },
  Product:       { resource: 'products',    ownerField: 'createdById',  prismaModel: 'product' },
  Expense:       { resource: 'expenses',    ownerField: 'userId',       prismaModel: 'expenseReport' },
};

type PrismaDelegate = { findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown> };

@Injectable()
export class LinkedAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async assertCanAccess(user: AuthUser, linkedModel: string, linkedToId: string): Promise<void> {
    const config = MODEL_CONFIG[linkedModel];
    if (!config) return;
    const scope = await this.visibility.ownershipWhere(user, config.resource, config.ownerField);
    const delegate = (this.prisma as unknown as Record<string, PrismaDelegate>)[config.prismaModel];
    const record = await delegate.findFirst({ where: { id: linkedToId, ...scope } });
    if (!record) throw new ForbiddenException('Access denied');
  }
}
