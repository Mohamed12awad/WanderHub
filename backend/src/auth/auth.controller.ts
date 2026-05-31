import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter limit than the global default to slow credential-stuffing /
  // brute-force attempts: 5 attempts per minute per IP.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin')
  @HttpCode(200)
  signin(@Body() body: { email: string; password: string }) {
    return this.authService.signin(body.email, body.password);
  }

  // Exchanges a valid refresh token for a new access token, rotating the
  // refresh token in the process.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    const result = await this.authService.refresh(body?.refreshToken);
    if (!result) throw new UnauthorizedException('Invalid or expired session');
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { refreshToken?: string }) {
    await this.authService.logout(body?.refreshToken);
    return { success: true };
  }
}
