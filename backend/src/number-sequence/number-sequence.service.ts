import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically increments and returns the next formatted sequence number.
   * Mirrors the legacy `nextNumber` helper.
   */
  async nextNumber(
    key: string,
    prefix = '',
    padLength = 4,
    separator = '-',
  ): Promise<string> {
    const seq = await this.prisma.numberSequence.upsert({
      where: { key },
      create: { key, prefix, padLength, separator, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const padded = String(seq.lastNumber).padStart(seq.padLength, '0');
    return seq.prefix ? `${seq.prefix}${seq.separator}${padded}` : padded;
  }
}
