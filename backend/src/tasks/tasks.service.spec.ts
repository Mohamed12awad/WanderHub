import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';

function buildPrisma() {
  return {
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
}

const timelineMock = { log: jest.fn().mockResolvedValue(undefined) } as any;
const visibilityMock = { ownershipWhere: jest.fn().mockResolvedValue({}) } as any;
const dispatcherMock = { dispatch: jest.fn().mockResolvedValue(undefined) } as any;
const customFieldsMock = { validateAndClean: jest.fn().mockResolvedValue({}) } as any;

const sampleTask = {
  id: 'task-1',
  title: 'Fix the bug',
  description: null,
  status: 'todo',
  priority: 'medium',
  assignedToId: null,
  createdById: 'user-1',
  dueDate: null,
  linkedToId: null,
  linkedModel: null,
  dealId: null,
  completedAt: null,
  tags: [],
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedTo: null,
};

describe('TasksService.create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a task and returns the serialized record', async () => {
    const prisma = buildPrisma();
    prisma.task.create.mockResolvedValue({ ...sampleTask, id: 'task-new' });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    const result: any = await svc.create({ title: 'Fix the bug', priority: 'medium', status: 'todo' } as any, 'user-1');

    expect(prisma.task.create).toHaveBeenCalledTimes(1);
    expect(result._id).toBe('task-new');
  });

  it('dispatches task_assigned notification when assignedTo differs from creator', async () => {
    const prisma = buildPrisma();
    prisma.task.create.mockResolvedValue({ ...sampleTask, assignedToId: 'user-2' });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.create({ title: 'Fix the bug', priority: 'medium', status: 'todo', assignedTo: 'user-2' } as any, 'user-1');

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', type: 'task_assigned' }),
    );
  });

  it('does not dispatch notification when creator is the assignee', async () => {
    const prisma = buildPrisma();
    prisma.task.create.mockResolvedValue({ ...sampleTask, assignedToId: 'user-1' });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.create({ title: 'Fix', priority: 'medium', status: 'todo', assignedTo: 'user-1' } as any, 'user-1');

    expect(dispatcherMock.dispatch).not.toHaveBeenCalled();
  });

  it('logs timeline when task has a linked entity', async () => {
    const prisma = buildPrisma();
    prisma.task.create.mockResolvedValue({ ...sampleTask, linkedToId: 'deal-1', linkedModel: 'Deal', assignedToId: null });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.create({ title: 'Fix', priority: 'medium', status: 'todo' } as any, 'user-1');

    expect(timelineMock.log).toHaveBeenCalledWith(
      'task.created',
      expect.stringContaining('Fix'),
      'deal-1',
      'Deal',
      expect.any(Object),
      'user-1',
    );
  });
});

describe('TasksService.update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = buildPrisma();
    prisma.task.findUnique.mockResolvedValue(null);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);
    await expect(svc.update('missing', { title: 'x' } as any, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('applies changes and returns serialized task', async () => {
    const prisma = buildPrisma();
    prisma.task.findUnique.mockResolvedValue(sampleTask);
    const updated = { ...sampleTask, title: 'Updated title', assignedTo: null, createdBy: null };
    prisma.task.update.mockResolvedValue(updated);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    const result: any = await svc.update('task-1', { title: 'Updated title' } as any, 'user-1');

    expect(result.title).toBe('Updated title');
  });

  it('dispatches notification when assignee changes to someone other than the updater', async () => {
    const prisma = buildPrisma();
    prisma.task.findUnique.mockResolvedValue({ ...sampleTask, assignedToId: null });
    prisma.task.update.mockResolvedValue({ ...sampleTask, assignedToId: 'user-3', assignedTo: null, createdBy: null });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.update('task-1', { assignedTo: 'user-3' } as any, 'user-1');

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-3', type: 'task_assigned' }),
    );
  });
});

describe('TasksService.complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = buildPrisma();
    prisma.task.findFirst.mockResolvedValue(null);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);
    await expect(svc.complete('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('sets status to "done" when task is not yet complete', async () => {
    const prisma = buildPrisma();
    prisma.task.findFirst.mockResolvedValue({ ...sampleTask, status: 'todo' });
    prisma.task.update.mockResolvedValue({ ...sampleTask, status: 'done' });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    const result: any = await svc.complete('task-1', 'user-1');

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'done' }) }),
    );
    expect(result.status).toBe('done');
  });

  it('toggles back to "todo" when task is already done', async () => {
    const prisma = buildPrisma();
    prisma.task.findFirst.mockResolvedValue({ ...sampleTask, status: 'done' });
    prisma.task.update.mockResolvedValue({ ...sampleTask, status: 'todo' });
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.complete('task-1', 'user-1');

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'todo' }) }),
    );
  });
});

describe('TasksService.remove', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = buildPrisma();
    prisma.task.findFirst.mockResolvedValue(null);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);
    await expect(svc.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('soft-deletes the task by setting deletedAt', async () => {
    const prisma = buildPrisma();
    prisma.task.findFirst.mockResolvedValue(sampleTask);
    prisma.task.update.mockResolvedValue({});
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    const result = await svc.remove('task-1');

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toBe(true);
  });
});

describe('TasksService.findAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('applies mine filter to restrict to the requesting user', async () => {
    const prisma = buildPrisma();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.findAll({ mine: 'true', _userId: 'user-1' }, { id: 'user-1' } as any);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedToId: 'user-1' }),
      }),
    );
  });

  it('applies overdue filter for past due dates excluding done/cancelled', async () => {
    const prisma = buildPrisma();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);
    const svc = new TasksService(prisma, timelineMock, visibilityMock, dispatcherMock, customFieldsMock);

    await svc.findAll({ overdue: 'true', _userId: 'user-1' }, { id: 'user-1' } as any);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: { lt: expect.any(Date) },
          status: { notIn: ['done', 'cancelled'] },
        }),
      }),
    );
  });
});
