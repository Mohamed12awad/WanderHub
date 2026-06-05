import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a key and returns the raw secret EXACTLY ONCE (never stored plaintext). */
  async create(dto: CreateApiKeyDto, creator: AuthUser) {
    const userId = dto.userId || creator.id;
    const raw = `nh_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 11);

    const rec = await this.prisma.apiKey.create({
      data: { name: dto.name, prefix, keyHash, userId, createdById: creator.id },
    });

    return { id: rec.id, name: rec.name, prefix: rec.prefix, key: raw, createdAt: rec.createdAt };
  }

  list() {
    return this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async revoke(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    if (!key.revokedAt) {
      await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    }
    return true;
  }
}
