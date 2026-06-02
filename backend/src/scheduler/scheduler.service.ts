import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

/**
 * Background maintenance. In a long-running deployment the @Cron decorators
 * drive these jobs; on serverless (where in-process timers don't fire) the same
 * methods are invoked by the guarded /internal/cron endpoint via a platform cron.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  /**
   * Flips past-due invoices/bills to `overdue` and notifies their owners.
   * Returns counts so the cron endpoint can report what it did.
   */
  async runOverdueSweep(): Promise<{ invoices: number; bills: number }> {
    const now = new Date();

    const dueInvoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null, status: { in: ['sent', 'partially_paid'] }, dueDate: { lt: now } },
      select: { id: true, invoiceNumber: true, createdById: true },
    });
    if (dueInvoices.length) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: dueInvoices.map((i) => i.id) } },
        data: { status: 'overdue' },
      });
      for (const inv of dueInvoices) {
        if (inv.createdById) {
          this.dispatcher.dispatchBackground({
            userId: inv.createdById,
            type: 'invoice_overdue',
            title: `Invoice ${inv.invoiceNumber} is overdue`,
            link: `/finance/invoices/${inv.id}`,
          });
        }
      }
    }

    const dueBills = await this.prisma.vendorBill.findMany({
      where: { deletedAt: null, status: { in: ['received', 'partially_paid'] }, dueDate: { lt: now } },
      select: { id: true, billNumber: true, createdById: true },
    });
    if (dueBills.length) {
      await this.prisma.vendorBill.updateMany({
        where: { id: { in: dueBills.map((b) => b.id) } },
        data: { status: 'overdue' },
      });
      for (const bill of dueBills) {
        if (bill.createdById) {
          this.dispatcher.dispatchBackground({
            userId: bill.createdById,
            type: 'bill_overdue',
            title: `Vendor bill ${bill.billNumber} is overdue`,
            link: `/procurement/bills/${bill.id}`,
          });
        }
      }
    }

    if (dueInvoices.length || dueBills.length) {
      this.logger.log(`Overdue sweep: ${dueInvoices.length} invoice(s), ${dueBills.length} bill(s)`);
    }
    return { invoices: dueInvoices.length, bills: dueBills.length };
  }

  /** Runs the full maintenance cycle (overdue sweep + email delivery). */
  async runMaintenance() {
    const overdue = await this.runOverdueSweep();
    const email = await this.dispatcher.drainOutbox();
    return { overdue, email };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyOverdueSweep() {
    await this.runOverdueSweep();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async drainEmailOutbox() {
    await this.dispatcher.drainOutbox();
  }
}
