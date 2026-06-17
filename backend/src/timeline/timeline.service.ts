import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LinkedModel =
  | 'Customer' | 'Deal' | 'Quote' | 'Invoice' | 'Expense' | 'Product' | 'Task'
  | 'PurchaseOrder' | 'VendorBill' | 'Project' | 'Lead' | 'Supplier' | 'SalesOrder';

// Bookkeeping/relational columns that change on every save and would only add
// noise to the timeline diff.
const DEFAULT_IGNORED = new Set([
  'id', '_id', 'createdAt', 'updatedAt', 'deletedAt', 'updatedById', 'updatedBy',
]);

/** Normalizes a value to a stable string for change comparison. */
function normalize(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return v.toISOString();
  // Prisma Decimal columns come back as Decimal objects from the DB but as
  // plain numbers from the request body — compare both as canonical numbers
  // so an unchanged amount isn't recorded as a change.
  if (Prisma.Decimal.isDecimal(v)) return new Prisma.Decimal(v as Prisma.Decimal).toString();
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  // Canonicalize date-ish strings so a "2026-06-28" form value matches the
  // stored DateTime read back as a Date object.
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return String(v);
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a generic "<entity> updated" event by diffing the fields that were
   * actually submitted (`changed`) against the record's prior state (`before`).
   *
   * Unlike the old per-service allowlists, this records EVERY changed field
   * (minus bookkeeping columns), so contact/company/custom-field/owner edits all
   * show up in the timeline. No-ops (no real change) are skipped.
   */
  async logUpdate(params: {
    eventType: string;
    title: string;
    linkedModel: LinkedModel;
    id: string;
    before: Record<string, unknown>;
    changed: Record<string, unknown>;
    userId?: string;
    ignore?: string[];
  }): Promise<void> {
    const ignore = new Set([...DEFAULT_IGNORED, ...(params.ignore ?? [])]);
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(params.changed)) {
      if (ignore.has(key)) continue;
      const from = (params.before as Record<string, unknown>)[key];
      const to = params.changed[key];
      if (normalize(from) !== normalize(to)) changes[key] = { from, to };
    }
    if (Object.keys(changes).length === 0) return;
    await this.log(params.eventType, params.title, params.id, params.linkedModel, { changes }, params.userId);
  }

  /**
   * Logs a timeline event. Side-effect only — never throws into the request.
   * Mirrors the legacy `logTimeline` signature.
   */
  async log(
    eventType: string,
    title: string,
    linkedTo: string,
    linkedModel: 'Customer' | 'Deal' | 'Quote' | 'Invoice' | 'Expense' | 'Product' | 'Task' | 'PurchaseOrder' | 'VendorBill' | 'Project' | 'Lead' | 'Supplier' | 'SalesOrder',
    payload?: Record<string, unknown>,
    triggeredBy?: string,
  ): Promise<void> {
    try {
      await this.prisma.timelineEvent.create({
        data: {
          eventType,
          title,
          linkedToId: linkedTo,
          linkedModel,
          payload: payload as Prisma.InputJsonValue | undefined,
          ...(linkedModel === 'Customer' ? { customerId: linkedTo } : {}),
          ...(linkedModel === 'Deal' ? { dealId: linkedTo } : {}),
          ...(linkedModel === 'Project' ? { projectId: linkedTo } : {}),
          triggeredById: triggeredBy || undefined,
          isSystem: !triggeredBy,
        },
      });
    } catch (err) {
      this.logger.error({ err }, 'Failed to log timeline event');
    }
  }
}
