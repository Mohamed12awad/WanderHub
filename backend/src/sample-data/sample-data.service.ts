import { Injectable } from '@nestjs/common';
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
    await seedAll(this.client);
    return { ok: true };
  }

  async clear() {
    const { total, counts } = await clearSampleData(this.client);
    return { ok: true, total, counts };
  }
}
