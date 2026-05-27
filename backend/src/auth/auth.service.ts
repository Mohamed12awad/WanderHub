import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

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

  async signup(body: Record<string, any>) {
    const { role, password, ...rest } = body;
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt());
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashed,
        ...(role ? { role: { connect: { id: role } } } : {}),
      } as any,
    });
    return toClient(user);
  }

  async signin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return { status: 400, body: { message: 'User not found' } };
    if (user.active === false) return { status: 400, body: { message: 'User is Blocked' } };

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return { status: 400, body: { message: 'Invalid credentials' } };

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
