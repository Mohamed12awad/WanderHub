import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // mirrors AuthService refresh TTL

// The refresh token lives in an httpOnly cookie scoped to the auth endpoints.
// SameSite=Strict means it is never sent on cross-site requests, which is the
// CSRF mitigation for /refresh and /logout. API calls authenticate with the
// short-lived access token via the Authorization header (not a cookie), so the
// rest of the API is not CSRF-exposed.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter limit than the global default to slow credential-stuffing /
  // brute-force attempts: 5 attempts per minute per IP.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin')
  @HttpCode(200)
  async signin(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = (req.headers as Record<string, string>)['user-agent'];
    const forwarded = (req.headers as Record<string, string>)['x-forwarded-for'];
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    const { token, refreshToken, user } = await this.authService.signin(
      body.email,
      body.password,
      { userAgent, ipAddress },
    );
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return { token, user };
  }

  // Exchanges the refresh cookie for a new access token, rotating the refresh
  // token (and its cookie) in the process.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.refresh(presented);
    if (!result) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      throw new UnauthorizedException('Invalid or expired session');
    }
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    return { token: result.token, user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    return { success: true };
  }
}
