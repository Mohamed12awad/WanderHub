import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  async signup(@Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const user = await this.authService.signup(body);
      return res.status(201).json(user);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  @Post('signin')
  async signin(
    @Body() body: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.signin(body.email, body.password);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }
}
