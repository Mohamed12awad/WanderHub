import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  type?: string;
}

/**
 * Accepts the token either as a raw header value or as a `Bearer <token>`
 * value, matching the behaviour of the original `requireSignin` middleware.
 */
function extractToken(req: any): string | null {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) return null;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return authHeader;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * Runs on every authenticated request. Role, permissions and the active flag
   * are read fresh from the DB rather than trusted from the token, so role
   * changes and deactivations take effect immediately (instant revocation).
   */
  async validate(payload: JwtPayload) {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || user.active === false || !user.role) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }
    return {
      id: user.id,
      role: user.role.name,
      roleId: user.role.id,
      permissions: user.role.permissions ?? [],
    };
  }
}
