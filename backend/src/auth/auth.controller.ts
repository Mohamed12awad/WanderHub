import {
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public self-service signup has been removed. Accounts are created only by
  // privileged users through the `users` module (users:create permission).

  // Tighter limit than the global default to slow credential-stuffing /
  // brute-force attempts: 5 attempts per minute per IP.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin')
  async signin(
    @Body() body: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.signin(body.email, body.password);
      return res.status(result.status).json(result.body);
    } catch {
      // Never leak internal error details on the auth path.
      return res
        .status(500)
        .json({ message: 'Something went wrong. Please try again.' });
    }
  }
}
