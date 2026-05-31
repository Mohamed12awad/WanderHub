import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

function buildPrisma() {
  return {
    user: { findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt-new' }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;
}

const jwtMock = { sign: jest.fn().mockReturnValue('access.jwt.token') } as any;

const roleUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Alice',
  active: true,
  password: 'hashed',
  role: { id: 'r1', name: 'sales', permissions: ['deals:view'] },
};

describe('AuthService.signin', () => {
  it('throws BadRequestException for an unknown email (no enumeration)', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const svc = new AuthService(prisma, jwtMock);

    await expect(svc.signin('nobody@x.com', 'pw')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for a wrong password', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(roleUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const svc = new AuthService(prisma, jwtMock);

    await expect(svc.signin('a@b.com', 'wrong')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException for a blocked account only after the password checks out', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ ...roleUser, active: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const svc = new AuthService(prisma, jwtMock);

    await expect(svc.signin('a@b.com', 'pw')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('issues an access token and a stored refresh token on success', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(roleUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const svc = new AuthService(prisma, jwtMock);

    const res: any = await svc.signin('a@b.com', 'pw');
    expect(res.token).toBe('access.jwt.token');
    expect(typeof res.refreshToken).toBe('string');
    expect(res.refreshToken.length).toBeGreaterThan(20);
    expect(res.user).toMatchObject({ id: 'u1', role: 'sales' });
    // The raw token is never persisted — only a hash.
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(res.refreshToken);
  });
});

describe('AuthService.refresh', () => {
  it('returns null for a missing token', async () => {
    const svc = new AuthService(buildPrisma(), jwtMock);
    expect(await svc.refresh(undefined)).toBeNull();
  });

  it('returns null for an unknown / revoked / expired token', async () => {
    const prisma = buildPrisma();
    const svc = new AuthService(prisma, jwtMock);

    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    expect(await svc.refresh('x')).toBeNull();

    prisma.refreshToken.findUnique.mockResolvedValueOnce({ id: 't', revokedAt: new Date(), expiresAt: new Date(Date.now() + 1e6), user: roleUser });
    expect(await svc.refresh('x')).toBeNull();

    prisma.refreshToken.findUnique.mockResolvedValueOnce({ id: 't', revokedAt: null, expiresAt: new Date(Date.now() - 1e6), user: roleUser });
    expect(await svc.refresh('x')).toBeNull();
  });

  it('rotates the token and returns a new access token on success', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 't-old', userId: 'u1', revokedAt: null,
      expiresAt: new Date(Date.now() + 1e6), user: roleUser,
    });
    const svc = new AuthService(prisma, jwtMock);

    const res: any = await svc.refresh('raw-token');
    expect(res.token).toBe('access.jwt.token');
    expect(typeof res.refreshToken).toBe('string');
    // Old token revoked, new token created.
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({ where: { id: 't-old' }, data: { revokedAt: expect.any(Date) } });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('revokes and rejects when the account is blocked', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 't-old', userId: 'u1', revokedAt: null,
      expiresAt: new Date(Date.now() + 1e6), user: { ...roleUser, active: false },
    });
    const svc = new AuthService(prisma, jwtMock);

    expect(await svc.refresh('raw-token')).toBeNull();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({ where: { id: 't-old' }, data: { revokedAt: expect.any(Date) } });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  it('revokes the presented token', async () => {
    const prisma = buildPrisma();
    const svc = new AuthService(prisma, jwtMock);
    await svc.logout('raw-token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('is a no-op without a token', async () => {
    const prisma = buildPrisma();
    const svc = new AuthService(prisma, jwtMock);
    await svc.logout(undefined);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
