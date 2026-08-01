import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The narrow slice of a Prisma client this service needs. Declared structurally
 * so both `PrismaService` and a `Prisma.TransactionClient` satisfy it — the
 * point being that callers can hand over their own transaction.
 */
interface SequenceWriter {
  numberSequence: {
    upsert(args: {
      where: { key: string };
      create: { key: string; prefix: string; padLength: number; separator: string; lastNumber: number };
      update: { lastNumber: { increment: number } };
    }): Promise<{ lastNumber: number; prefix: string; padLength: number; separator: string }>;
  };
}

@Injectable()
export class NumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically increments and returns the next formatted sequence number.
   *
   * Pass `db` (a Prisma transaction client) to allocate inside the caller's
   * transaction. Audit 2026-08 (P1): this always used the root connection, so a
   * rollback still consumed the number — and `withSerializableRetry` made that
   * systematic, burning a fresh number on every retry. Gapless journal
   * numbering is a statutory requirement in many jurisdictions.
   */
  async nextNumber(
    key: string,
    prefix = '',
    padLength = 4,
    separator = '-',
    db: SequenceWriter = this.prisma,
  ): Promise<string> {
    const seq = await db.numberSequence.upsert({
      where: { key },
      create: { key, prefix, padLength, separator, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const padded = String(seq.lastNumber).padStart(seq.padLength, '0');
    return seq.prefix ? `${seq.prefix}${seq.separator}${padded}` : padded;
  }
}
