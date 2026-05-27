import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

const PROTECTED = ['super admin'];

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({ where: { name: { not: 'super admin' } } });
    return toClient(roles);
  }

  async create(name: string, permissions: string[]) {
    const role = await this.prisma.role.create({ data: { name: name.trim().toLowerCase(), permissions } });
    return toClient(role);
  }

  async update(id: string, permissions: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) return null;
    if (PROTECTED.includes(role.name)) return { forbidden: true };
    const updated = await this.prisma.role.update({ where: { id }, data: { permissions } });
    return toClient(updated);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) return null;
    if (PROTECTED.includes(role.name)) return { forbidden: true };
    await this.prisma.role.delete({ where: { id } });
    return true;
  }
}
