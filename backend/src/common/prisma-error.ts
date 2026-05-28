import { Response } from 'express';
import { Prisma } from '@prisma/client';

/** Maps Prisma P2002 unique constraint violations to a 409 with a friendly message. */
export function handlePrismaError(error: unknown, res: Response) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const fields = (error.meta?.target as string[]) ?? [];
    const field = fields[0] ?? 'field';
    return res.status(409).json({ message: `A record with this ${field} already exists.` });
  }
  return res.status(400).json({ message: (error as Error).message });
}
