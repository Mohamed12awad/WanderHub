import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a key and returns the raw secret EXACTLY ONCE (never stored plaintext). */
  async create(dto: CreateApiKeyDto, creator: AuthUser) {
    let userId = creator.id;
    // Binding a key to another user is an admin-only action: the key inherits
    // that user's role + permissions at request time (see ApiKeyGuard), so
    // letting any settings:manage holder target an arbitrary user is privilege
    // escalation (mint a key bound to a super admin, then call /public/v1 as
    // them). Restrict cross-user binding to super admins / '*' holders and
    // require the target to be a real, active user.
    if (dto.userId && dto.userId !== creator.id) {
      const isSuperAdmin = creator.role === 'super admin' || creator.permissions.includes('*');
      if (!isSuperAdmin) {
        throw new ForbiddenException('You can only create API keys bound to your own user.');
      }
      const target = await this.prisma.user.findFirst({ where: { id: dto.userId, active: true } });
      if (!target) throw new BadRequestException('Target user not found or inactive.');
      userId = target.id;
    }
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
