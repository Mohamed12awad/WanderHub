import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

function buildPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    refreshToken: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    log: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
}

const sampleUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  phone: '01011111111',
  password: '$2b$12$hashedpassword',
  active: true,
  role: { id: 'role-1', name: 'admin' },
  reportsTo: null,
  directReports: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService.create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hashes the password and creates the user', async () => {
    const prisma = buildPrisma();
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');
    prisma.user.create.mockResolvedValue(sampleUser);

    const svc = new UsersService(prisma);
    const result: any = await svc.create({ name: 'Alice', email: 'alice@example.com', phone: '01011111111', password: 'secret123', role: 'role-1' });

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: '$2b$12$newhash' }) }),
    );
    expect(result._id).toBe('user-1');
  });
});

describe('UsersService.changePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when user does not exist', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const svc = new UsersService(prisma);
    await expect(svc.changePassword('missing', 'old', 'new')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when current password is wrong', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(sampleUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const svc = new UsersService(prisma);
    await expect(svc.changePassword('user-1', 'wrongpass', 'newpass')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates the password hash when current password matches', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(sampleUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');
    prisma.user.update.mockResolvedValue({});
    const svc = new UsersService(prisma);

    const result = await svc.changePassword('user-1', 'correct', 'newpass');

    expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: '$2b$12$newhash' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('UsersService.getSessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns non-revoked non-expired refresh tokens for the user', async () => {
    const prisma = buildPrisma();
    const tokens = [
      { id: 'rt-1', createdAt: new Date(), userAgent: 'Chrome', ipAddress: '1.2.3.4', expiresAt: new Date(Date.now() + 86400_000) },
    ];
    prisma.refreshToken.findMany.mockResolvedValue(tokens);
    const svc = new UsersService(prisma);

    const result = await svc.getSessions('user-1');

    expect(prisma.refreshToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', revokedAt: null }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rt-1');
  });

  it('returns empty array when no active sessions exist', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findMany.mockResolvedValue([]);
    const svc = new UsersService(prisma);
    expect(await svc.getSessions('user-1')).toEqual([]);
  });
});

describe('UsersService.revokeSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundException when session does not exist', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    const svc = new UsersService(prisma);
    await expect(svc.revokeSession('user-1', 'rt-missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when session belongs to a different user', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', userId: 'other-user' });
    const svc = new UsersService(prisma);
    await expect(svc.revokeSession('user-1', 'rt-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('sets revokedAt when the session belongs to the requesting user', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', userId: 'user-1' });
    const svc = new UsersService(prisma);

    const result = await svc.revokeSession('user-1', 'rt-1');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('UsersService.getLoginHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries the log table for auth events and returns up to 30', async () => {
    const prisma = buildPrisma();
    const logs = Array.from({ length: 5 }, (_, i) => ({
      id: `log-${i}`,
      action: 'Logged in',
      endpoint: '/api/auth/signin',
      timestamp: new Date(),
      success: true,
    }));
    prisma.log.findMany.mockResolvedValue(logs);
    const svc = new UsersService(prisma);

    const result = await svc.getLoginHistory('user-1');

    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
        take: 30,
      }),
    );
    expect(result).toHaveLength(5);
  });

  it('returns empty array when no login history exists', async () => {
    const prisma = buildPrisma();
    prisma.log.findMany.mockResolvedValue([]);
    const svc = new UsersService(prisma);
    expect(await svc.getLoginHistory('user-1')).toEqual([]);
  });
});
