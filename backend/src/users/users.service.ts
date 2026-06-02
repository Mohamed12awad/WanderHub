import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Explicit bcrypt cost factor (overrides the library default of 10).
const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userInclude = {
    role: { select: { id: true, name: true } },
    reportsTo: { select: { id: true, name: true } },
    directReports: { select: { id: true, name: true, role: { select: { name: true } } } },
  };

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, active, phone, createdAt_from, createdAt_to } = query;
    if (!page) {
      const users = await this.prisma.user.findMany({ include: this.userInclude, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(users);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = {};
    if (q) where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
    if (active !== undefined && active !== '') where.active = active === 'true';
    if (phone) where.phone = { contains: phone, mode: 'insensitive' };
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, include: this.userInclude, skip: (p - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: this.userInclude });
    return user ? toClient(user) : null;
  }

  async create(body: CreateUserDto) {
    const { password, role, reportsTo, ...rest } = body;
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashed,
        ...(role ? { roleId: role } : {}),
        ...(reportsTo ? { reportsToId: reportsTo } : {}),
      } as any,
      include: this.userInclude,
    });
    return toClient(user);
  }

  async update(id: string, body: UpdateUserDto, requestingUserRole: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing) return null;

    const { password, role, reportsTo, ...rest } = body;
    const data: Record<string, any> = { ...rest };
    if (reportsTo !== undefined) data.reportsToId = reportsTo || null;

    if (role) {
      const newRole = await this.prisma.role.findUnique({ where: { id: role } });
      if (newRole?.name === 'super admin' && requestingUserRole !== 'super admin') {
        throw new ForbiddenException('Access denied. Super admin only.');
      }
      if (existing.role.name === 'super admin' && requestingUserRole !== 'super admin') {
        throw new ForbiddenException('Access denied. Super admin only.');
      }
      data.roleId = role;
    }

    if (password) {
      data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const user = await this.prisma.user.update({ where: { id }, data, include: this.userInclude });
    return toClient(user);
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const updated = await this.prisma.user.update({ where: { id }, data: { active: !user.active }, include: this.userInclude });
    return toClient(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) return null;
    if (user.role.name === 'super admin') throw new ForbiddenException('Cannot delete super admin');
    await this.prisma.user.delete({ where: { id } });
    return true;
  }
}
