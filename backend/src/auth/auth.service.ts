import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  generateToken(user: { id: string; role: { name: string; permissions: string[] } }) {
    return this.jwt.sign(
      {
        id: user.id,
        role: user.role.name,
        permissions: user.role.permissions ?? [],
      },
      { secret: process.env.JWT_SECRET, expiresIn: '8h' },
    );
  }

  async signin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Generic message for both unknown email and wrong password so the
    // endpoint cannot be used to enumerate valid accounts.
    const invalid = { status: 400, body: { message: 'Invalid email or password' } };

    if (!user) return invalid;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return invalid;

    // Only reveal the blocked state once the caller has proven they own the
    // account (correct password) — keeps it from leaking via enumeration.
    if (user.active === false) {
      return { status: 403, body: { message: 'This account has been blocked' } };
    }

    const token = this.generateToken(user as any);

    return {
      status: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          permissions: user.role.permissions ?? [],
        },
      },
    };
  }
}
