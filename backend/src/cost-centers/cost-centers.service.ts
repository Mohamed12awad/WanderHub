import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto/cost-center.dto';

const PARENT_SELECT = { parent: { select: { id: true, code: true, name: true } } };

@Injectable()
export class CostCentersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    const { q, isActive } = query;
    const where: Prisma.CostCenterWhereInput = { deletedAt: null };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const items = await this.prisma.costCenter.findMany({
      where,
      orderBy: { code: 'asc' },
      include: PARENT_SELECT,
    });
    return toClient(items);
  }

  async findOne(id: string) {
    const item = await this.prisma.costCenter.findFirst({
      where: { id, deletedAt: null },
      include: PARENT_SELECT,
    });
    if (!item) throw new NotFoundException('Cost center not found');
    return toClient(item);
  }

  async create(body: CreateCostCenterDto) {
    await this.assertCodeFree(body.code);
    if (body.parentId) await this.assertParentExists(body.parentId);
    const item = await this.prisma.costCenter.create({
      data: {
        code: body.code,
        name: body.name,
        isActive: body.isActive ?? true,
        parentId: body.parentId ?? null,
      },
    });
    return toClient(item);
  }

  async update(id: string, body: UpdateCostCenterDto) {
    const existing = await this.prisma.costCenter.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Cost center not found');
    if (body.code && body.code !== existing.code) await this.assertCodeFree(body.code);
    if (body.parentId) {
      if (body.parentId === id) throw new BadRequestException('A cost center cannot be its own parent.');
      await this.assertParentExists(body.parentId);
    }
    const item = await this.prisma.costCenter.update({
      where: { id },
      data: {
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId || null } : {}),
      },
      include: PARENT_SELECT,
    });
    return toClient(item);
  }

  /** Soft-delete. Blocked while active children exist (mirrors the schema's onDelete: Restrict). */
  async remove(id: string) {
    const existing = await this.prisma.costCenter.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Cost center not found');
    const children = await this.prisma.costCenter.count({ where: { parentId: id, deletedAt: null } });
    if (children > 0) {
      throw new BadRequestException('Cost center has child cost centers; re-parent or remove them first.');
    }
    await this.prisma.costCenter.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async assertCodeFree(code: string) {
    const dup = await this.prisma.costCenter.findFirst({ where: { code, deletedAt: null } });
    if (dup) throw new BadRequestException(`Cost center code ${code} already exists`);
  }

  private async assertParentExists(parentId: string) {
    const parent = await this.prisma.costCenter.findFirst({ where: { id: parentId, deletedAt: null } });
    if (!parent) throw new BadRequestException('Parent cost center not found');
  }
}
