import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Authenticates public API requests via the `x-api-key` header. The key acts as
 * its owning user, so request.user is populated with that user's role +
 * permissions — making the existing PermissionGuard and per-service visibility
 * rules apply unchanged. Only the SHA-256 hash is ever compared.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers['x-api-key'];
    if (!raw || typeof raw !== 'string') {
      throw new UnauthorizedException('Missing API key');
    }

    const keyHash = createHash('sha256').update(raw).digest('hex');
    const key = await this.prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      include: { user: { include: { role: true } } },
    });
    if (!key || !key.user || key.user.active === false || !key.user.role) {
      throw new UnauthorizedException('Invalid API key');
    }

    req.user = {
      id: key.user.id,
      role: key.user.role.name,
      roleId: key.user.role.id,
      permissions: key.user.role.permissions ?? [],
    };

    // Fire-and-forget usage stamp; never block the request on it.
    void this.prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }
}
