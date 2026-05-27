import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  id: string;
  role: string;
  permissions: string[];
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
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.id,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
