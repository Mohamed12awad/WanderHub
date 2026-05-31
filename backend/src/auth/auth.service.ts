import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Short-lived access token. Carries only the user id — role, permissions and
   * the active flag are re-read from the DB on every request by the JWT
   * strategy, so changes take effect immediately rather than at token expiry.
   */
  private signAccessToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, type: 'access' },
      { secret: process.env.JWT_SECRET, expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  /** Issues a new opaque refresh token and stores only its hash. */
  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  private publicUser(user: { id: string; email: string; name: string; role: { name: string; permissions: string[] } }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.role.permissions ?? [],
    };
  }

  async signin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Generic message for both unknown email and wrong password so the
    // endpoint cannot be used to enumerate valid accounts.
    if (!user) throw new BadRequestException('Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('Invalid email or password');

    // Only reveal the blocked state once the caller has proven they own the
    // account (correct password) — keeps it from leaking via enumeration.
    if (user.active === false) throw new ForbiddenException('This account has been blocked');

    const token = this.signAccessToken(user.id);
    const refreshToken = await this.issueRefreshToken(user.id);

    return { token, refreshToken, user: this.publicUser(user as any) };
  }

  /**
   * Validates a refresh token, rotates it (revoke old + issue new), and returns
   * a fresh access token. Returns null on any failure so the caller can answer
   * with a generic 401.
   */
  async refresh(rawToken: string | undefined) {
    if (!rawToken) return null;
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { include: { role: true } } },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return null;
    if (!existing.user || existing.user.active === false) {
      // Account gone or blocked — burn the token.
      await this.prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
      return null;
    }

    // Rotate: revoke the presented token and mint a new pair.
    const [, refreshToken] = await Promise.all([
      this.prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } }),
      this.issueRefreshToken(existing.userId),
    ]);
    const token = this.signAccessToken(existing.userId);

    return { token, refreshToken, user: this.publicUser(existing.user as any) };
  }

  /** Revokes the presented refresh token (idempotent). */
  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
