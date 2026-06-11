import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { seedAll, clearSampleData } from './sample-data.builder';

/**
 * In-app wrapper around the shared sample-data builder. The injected
 * PrismaService is the extended client; it is structurally a PrismaClient for
 * the delegate calls the builder makes, so we hand it straight through.
 */
@Injectable()
export class SampleDataService {
  constructor(private readonly prisma: PrismaService) {}

  private get client() {
    return this.prisma as unknown as PrismaClient;
  }

  async load() {
    // The seed provisions demo login accounts with a well-known password from
    // the public source. That is fine for dev/CLI use, but loading it from the
    // in-app endpoint on a production deployment would silently create those
    // accounts on a live system. Block it there unless explicitly opted in.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SAMPLE_DATA !== 'true') {
      throw new ForbiddenException(
        'Loading sample data is disabled in production. Set ALLOW_SAMPLE_DATA=true to enable it.',
      );
    }
    await seedAll(this.client);
    return { ok: true };
  }

  async clear() {
    const { total, counts } = await clearSampleData(this.client);
    return { ok: true, total, counts };
  }
}
