import { Module } from '@nestjs/common';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { PostingService } from './posting.service';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';
import { ReconciliationService } from './reconciliation.service';
import { PeriodCloseService } from './period-close.service';

/**
 * Double-entry General Ledger: chart of accounts, manual journal entries, the
 * auto-posting engine (PostingService — exported for invoice/procurement
 * services to post from inside their transactions), and financial statements.
 */
@Module({
  controllers: [ChartOfAccountsController, JournalController, StatementsController],
  providers: [ChartOfAccountsService, JournalService, PostingService, StatementsService, ReconciliationService, PeriodCloseService],
  exports: [ChartOfAccountsService, JournalService, PostingService, StatementsService, ReconciliationService, PeriodCloseService],
})
export class AccountingModule {}
