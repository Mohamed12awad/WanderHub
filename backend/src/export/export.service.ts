import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { stringify, Stringifier } from 'csv-stringify';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { EXPORT_ENTITIES, ExportEntityConfig } from './export.config';

/** Rows fetched per DB round-trip. Keeps peak memory ~one page regardless of total. */
const BATCH_SIZE = 500;

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  private config(entity: string): ExportEntityConfig {
    const cfg = EXPORT_ENTITIES[entity];
    if (!cfg) throw new NotFoundException(`Unknown export target: ${entity}`);
    return cfg;
  }

  /** Mirrors PermissionGuard semantics for the dynamic, per-entity view permission. */
  private assertCanView(user: AuthUser, required: string) {
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === required || p.startsWith(`${required}:`));
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
  }

  /** Awaits backpressure: resolves immediately, or on `drain` if the buffer is full. */
  private writeRow(stream: Stringifier, record: unknown[]): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.write(record, (err) => (err ? reject(err) : undefined));
      if (stream.writableNeedDrain) stream.once('drain', resolve);
      else resolve();
    });
  }

  /**
   * Streams the entire (non-deleted, visibility-scoped) dataset for `entity` to
   * `res` as CSV. Memory stays bounded by walking the table with a stable
   * id-cursor in BATCH_SIZE pages and piping each page through csv-stringify —
   * the full result is never materialised in memory.
   */
  async streamCsv(entity: string, user: AuthUser, res: Response): Promise<void> {
    const cfg = this.config(entity);
    this.assertCanView(user, cfg.permission);

    const scopeWhere = cfg.scope
      ? await this.visibility.ownershipWhere(user, cfg.scope.base, cfg.scope.ownerField)
      : {};
    const where: Record<string, unknown> = {
      ...(cfg.softDelete === false ? {} : { deletedAt: null }),
      ...scopeWhere,
    };

    const filename = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stringifier = stringify({ header: true, columns: cfg.columns.map((c) => c.header) });
    stringifier.pipe(res);

    // Stop early if the client disconnects mid-stream (avoid pointless DB work).
    let aborted = false;
    res.on('close', () => { aborted = true; });

    const delegate = (this.prisma as unknown as Record<
      string,
      { findMany(args: unknown): Promise<Record<string, any>[]> }
    >)[cfg.model];

    try {
      let cursor: string | undefined;
      for (;;) {
        if (aborted) break;
        const batch = await delegate.findMany({
          where,
          include: cfg.include,
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const row of batch) {
          await this.writeRow(stringifier, cfg.columns.map((c) => c.value(row) ?? ''));
        }
        if (batch.length < BATCH_SIZE) break;
        cursor = batch[batch.length - 1].id as string;
      }
      stringifier.end();
    } catch (err) {
      // Headers are already sent, so we can't switch to a JSON error — destroy the
      // stream so the client sees a truncated/failed download rather than a hang.
      stringifier.destroy(err as Error);
      if (!res.writableEnded) res.end();
    }
  }
}
