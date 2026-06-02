import { Injectable } from '@nestjs/common';
import type { WorkspaceConfig } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Short-TTL cache over the singleton WorkspaceConfig row. The config changes
 * rarely but is read on many request paths (approval gating, currency base),
 * so caching it removes a per-request DB round-trip. Writers must call
 * `invalidate()` after mutating settings.
 */
@Injectable()
export class WorkspaceConfigService {
  private cache: { value: WorkspaceConfig; at: number } | null = null;
  private readonly ttlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<WorkspaceConfig> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    let config = await this.prisma.workspaceConfig.findFirst();
    if (!config) config = await this.prisma.workspaceConfig.create({ data: {} });
    this.cache = { value: config, at: Date.now() };
    return config;
  }

  invalidate(): void {
    this.cache = null;
  }
}
