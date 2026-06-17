import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../common/currency.service';
import { PostingService } from './posting.service';

const DRIFT_TOLERANCE = 1; // base-currency units

export interface ReconciliationReport {
  ran: boolean;
  ledgerBalanced: boolean;
  ledgerDrift: number;
  arGl: number;
  arOperational: number;
  arDrift: number;
  alerts: string[];
}

/**
 * Daily integrity check that the GL is self-consistent and its caches haven't
 * drifted. Two checks:
 *   1. Ledger integrity — Σ baseAmount over all non-draft journal lines ≈ 0.
 *      A non-zero sum means a posting wrote an unbalanced entry: corruption.
 *   2. AR drift — the GL AR balance vs Σ outstanding on post-cutover invoices.
 * Alerts go to Sentry + the log so corruption surfaces the next day, not at audit.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly posting: PostingService,
  ) {}

  async reconcile(): Promise<ReconciliationReport> {
    const empty: ReconciliationReport = {
      ran: false, ledgerBalanced: true, ledgerDrift: 0, arGl: 0, arOperational: 0, arDrift: 0, alerts: [],
    };
    const gl = await this.posting.getGlConfig();
    if (!gl.glEnabled) return empty;

    const alerts: string[] = [];

    // 1. Ledger integrity — the whole ledger must net to zero in base currency.
    const ledgerAgg = await this.prisma.journalLine.aggregate({
      _sum: { baseAmount: true },
      where: { journalEntry: { status: { not: 'draft' } } },
    });
    const ledgerDrift = Number(ledgerAgg._sum.baseAmount ?? 0);
    const ledgerBalanced = Math.abs(ledgerDrift) < 0.01;
    if (!ledgerBalanced) {
      alerts.push(`GL ledger does not balance: Σ baseAmount = ${ledgerDrift.toFixed(4)} (expected 0).`);
    }

    // 2. AR drift — GL AR vs operational outstanding (post-cutover invoices).
    let arGl = 0;
    let arOperational = 0;
    if (gl.defaultArAccount) {
      const arAgg = await this.prisma.journalLine.aggregate({
        _sum: { baseAmount: true },
        where: { account: { code: gl.defaultArAccount }, journalEntry: { status: { not: 'draft' } } },
      });
      arGl = Number(arAgg._sum.baseAmount ?? 0);

      const cutover = gl.glCutoverDate ? new Date(gl.glCutoverDate) : undefined;
      const invoices = await this.prisma.invoice.findMany({
        where: {
          deletedAt: null,
          approvalStatus: 'approved',
          ...(cutover && !Number.isNaN(cutover.getTime()) ? { issueDate: { gte: cutover } } : {}),
        },
        select: { total: true, totalPaid: true, currency: true, exchangeRate: true },
      });
      for (const inv of invoices) {
        const outstanding = Number(inv.total) - Number(inv.totalPaid ?? 0);
        if (Math.abs(outstanding) < 0.0001) continue;
        arOperational += await this.currency.toBase(outstanding, inv.currency, inv.exchangeRate);
      }
      const arDrift = arGl - arOperational;
      if (Math.abs(arDrift) > DRIFT_TOLERANCE) {
        alerts.push(
          `AR drift: GL ${arGl.toFixed(2)} vs outstanding ${arOperational.toFixed(2)} (Δ ${arDrift.toFixed(2)}).`,
        );
      }
    }

    const arDrift = arGl - arOperational;
    if (alerts.length) {
      for (const a of alerts) this.logger.error(`[GL reconciliation] ${a}`);
      Sentry.captureMessage(`GL reconciliation drift:\n${alerts.join('\n')}`, 'warning');
    } else {
      this.logger.log('[GL reconciliation] OK — ledger balanced, AR reconciled.');
    }

    return { ran: true, ledgerBalanced, ledgerDrift, arGl, arOperational, arDrift, alerts };
  }
}
