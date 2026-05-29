import { BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';

function buildPrisma() {
  return {
    lead: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  } as any;
}

const timelineMock = { log: jest.fn().mockResolvedValue(undefined) } as any;
const notifMock    = { create: jest.fn().mockResolvedValue(undefined) } as any;
const visibilityMock = {
  ownershipWhere: jest.fn().mockResolvedValue({}),
} as any;

const sampleLead = {
  id: 'lead-1',
  name: 'Jane Doe',
  phone: '0501234567',
  email: 'jane@example.com',
  mobile: null,
  source: 'Website',
  status: 'new',
  notes: null,
  ownerId: null,
  createdById: 'user-1',
  convertedAt: null,
  convertedToId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('LeadsService.create', () => {
  it('creates a lead and returns the serialized record', async () => {
    const prisma = buildPrisma();
    prisma.lead.create.mockResolvedValue(sampleLead);
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    const result: any = await svc.create({ name: 'Jane Doe', phone: '0501234567', email: 'jane@example.com' }, 'user-1');
    expect(result._id).toBe('lead-1');
    expect(result.name).toBe('Jane Doe');
    expect(prisma.lead.create).toHaveBeenCalledTimes(1);
  });

  it('throws 400 when a lead with the same phone already exists', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue({ ...sampleLead, id: 'dup' });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    await expect(
      svc.create({ name: 'Dup', phone: '0501234567' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it('throws 400 when a customer with the same email exists', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue(null); // no dup lead
    prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'Existing' });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    await expect(
      svc.create({ name: 'Dup', email: 'jane@example.com' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fires a lead_assigned notification when owner differs from creator', async () => {
    const prisma = buildPrisma();
    prisma.lead.create.mockResolvedValue({ ...sampleLead, ownerId: 'owner-99' });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    await svc.create({ name: 'Jane', owner: 'owner-99' }, 'creator-1');
    expect(notifMock.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'lead_assigned', userId: 'owner-99' }));
  });

  it('does NOT fire a notification when the creator is also the owner', async () => {
    const prisma = buildPrisma();
    prisma.lead.create.mockResolvedValue({ ...sampleLead, ownerId: 'user-1' });
    notifMock.create.mockClear();
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    await svc.create({ name: 'Jane', owner: 'user-1' }, 'user-1');
    expect(notifMock.create).not.toHaveBeenCalled();
  });
});

describe('LeadsService.convertToCustomer', () => {
  it('throws 400 if the lead is already converted', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue({ ...sampleLead, status: 'converted' });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    await expect(svc.convertToCustomer('lead-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns null when the lead does not exist', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue(null);
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    const result = await svc.convertToCustomer('lead-1', 'user-1');
    expect(result).toBeNull();
  });

  it('creates a customer, marks the lead converted, and logs a timeline event', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue(sampleLead);
    prisma.customer.create.mockResolvedValue({ id: 'cust-new', name: 'Jane Doe' });
    prisma.lead.update.mockResolvedValue({ ...sampleLead, status: 'converted' });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    const customer: any = await svc.convertToCustomer('lead-1', 'user-1');
    expect(customer._id).toBe('cust-new');
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'converted', convertedToId: 'cust-new' }) }),
    );
    expect(timelineMock.log).toHaveBeenCalled();
  });
});

describe('LeadsService.remove', () => {
  it('returns null when lead is not found', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue(null);
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    expect(await svc.remove('lead-missing')).toBeNull();
  });

  it('soft-deletes the lead and returns true', async () => {
    const prisma = buildPrisma();
    prisma.lead.findFirst.mockResolvedValue(sampleLead);
    prisma.lead.update.mockResolvedValue({ ...sampleLead, deletedAt: new Date() });
    const svc = new LeadsService(prisma, timelineMock, notifMock, visibilityMock);

    const result = await svc.remove('lead-1');
    expect(result).toBe(true);
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });
});
