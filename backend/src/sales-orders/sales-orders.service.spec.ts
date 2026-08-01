import { NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';

describe('SalesOrdersService — mutation scope', () => {
  it('returns not-found and performs no write for another user\'s sales order', async () => {
    const otherUserOrder = {
      id: 'so-user-b',
      createdById: 'user-b',
      status: 'draft',
      approvalStatus: 'pending',
      deletedAt: null,
    };
    const prisma: any = {
      salesOrder: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.createdById === 'user-a' ? null : otherUserOrder,
        ),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const visibility: any = {
      ownershipWhere: jest.fn().mockResolvedValue({ createdById: 'user-a' }),
    };
    const service = new SalesOrdersService(
      prisma,
      {} as any,
      { log: jest.fn(), logUpdate: jest.fn() } as any,
      {} as any,
      {} as any,
      visibility,
    );
    const user = {
      id: 'user-a',
      role: 'member',
      roleId: 'member-role',
      permissions: ['sales-orders:edit:own'],
    };

    await expect(service.update('so-user-b', { title: 'tampered' } as any, user))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'sales-orders', 'createdById');
    expect(prisma.salesOrder.findFirst).toHaveBeenCalledWith({
      where: { id: 'so-user-b', deletedAt: null, createdById: 'user-a' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.salesOrder.update).not.toHaveBeenCalled();
  });
});
