import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

function buildPrisma() {
  const tx = {
    deal: { updateMany: jest.fn().mockResolvedValue({}) },
    quote: { updateMany: jest.fn().mockResolvedValue({}) },
    invoice: { updateMany: jest.fn().mockResolvedValue({}) },
    customer: { update: jest.fn().mockResolvedValue({}) },
  };
  return {
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoice: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((cb: any) => cb(tx)),
    _tx: tx,
  } as any;
}

const timelineMock = { log: jest.fn().mockResolvedValue(undefined) } as any;
const visibilityMock = { ownershipWhere: jest.fn().mockResolvedValue({}) } as any;
const customFieldsMock = { validateAndClean: jest.fn().mockResolvedValue({}) } as any;
const dealsMock = {} as any;

const mockUser: any = { id: 'user-1', role: 'admin', roleId: 'role-admin', permissions: ['*'] };

const sampleCustomer = {
  id: 'cust-1',
  name: 'Acme Corp',
  email: 'acme@example.com',
  phone: '01099999999',
  mobile: null,
  status: 'active',
  gender: null,
  source: null,
  notes: null,
  location: null,
  ownerId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deals: [],
  owner: null,
};

describe('CustomersService.create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a customer and returns the serialized record', async () => {
    const prisma = buildPrisma();
    prisma.customer.create.mockResolvedValue(sampleCustomer);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    const result: any = await svc.create({ name: 'Acme Corp', phone: '01099999999' } as any, 'user-1');

    expect(prisma.customer.create).toHaveBeenCalledTimes(1);
    expect(result._id).toBe('cust-1');
    expect(result.name).toBe('Acme Corp');
  });

  it('logs a timeline event after creation', async () => {
    const prisma = buildPrisma();
    prisma.customer.create.mockResolvedValue(sampleCustomer);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    await svc.create({ name: 'Acme Corp', phone: '01099999999' } as any, 'user-1');

    expect(timelineMock.log).toHaveBeenCalledWith(
      'contact.created',
      expect.stringContaining('Acme Corp'),
      'cust-1',
      'Customer',
      expect.any(Object),
      'user-1',
    );
  });
});

describe('CustomersService.findOne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when customer does not exist', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(null);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);
    await expect(svc.findOne('missing', mockUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the serialized customer when found', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(sampleCustomer);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    const result: any = await svc.findOne('cust-1', mockUser);

    expect(result._id).toBe('cust-1');
    expect(result.name).toBe('Acme Corp');
  });
});

describe('CustomersService.update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when customer does not exist', async () => {
    const prisma = buildPrisma();
    prisma.customer.findUnique.mockResolvedValue(null);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);
    await expect(svc.update('missing', { name: 'New' } as any, mockUser, mockUser.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('applies changes and returns the serialized record', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(sampleCustomer);
    prisma.customer.update.mockResolvedValue({ ...sampleCustomer, name: 'New Name' });
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    const result: any = await svc.update('cust-1', { name: 'New Name' } as any, mockUser, mockUser.id);

    expect(result.name).toBe('New Name');
    expect(prisma.customer.update).toHaveBeenCalledTimes(1);
  });
});

describe('CustomersService.remove', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when customer does not exist', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(null);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);
    await expect(svc.remove('missing', mockUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when customer has open invoices', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(sampleCustomer);
    prisma.invoice.count.mockResolvedValue(2);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);
    await expect(svc.remove('cust-1', mockUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft-deletes customer and cascades to deals/quotes/invoices in a transaction', async () => {
    const prisma = buildPrisma();
    prisma.customer.findFirst.mockResolvedValue(sampleCustomer);
    prisma.invoice.count.mockResolvedValue(0);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    const result = await svc.remove('cust-1', mockUser);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });
});

describe('CustomersService.findAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated results', async () => {
    const prisma = buildPrisma();
    prisma.customer.findMany.mockResolvedValue([sampleCustomer]);
    prisma.customer.count.mockResolvedValue(1);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    const result: any = await svc.findAll({ page: '1', limit: '25' }, mockUser);

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('applies q search filter across name, email, and phone', async () => {
    const prisma = buildPrisma();
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);
    const svc = new CustomersService(prisma, timelineMock, visibilityMock, customFieldsMock, dealsMock);

    await svc.findAll({ q: 'acme', page: '1', limit: '25' }, mockUser);

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
            expect.objectContaining({ email: expect.any(Object) }),
            expect.objectContaining({ phone: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });
});
