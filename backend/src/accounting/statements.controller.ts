import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { MoneyAsString } from '../common/money-as-string.decorator';
import { StatementsService } from './statements.service';
import { PeriodCloseService } from './period-close.service';
import { ReconciliationService } from './reconciliation.service';
import { FiscalYearService } from './fiscal-year.service';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionGuard)
@MoneyAsString()
export class StatementsController {
  constructor(
    private readonly statements: StatementsService,
    private readonly periods: PeriodCloseService,
    private readonly reconciliation: ReconciliationService,
    private readonly fiscalYear: FiscalYearService,
  ) {}

  @Post('reconcile')
  @HttpCode(200)
  @RequirePermission('accounting:view')
  reconcile() {
    return this.reconciliation.reconcile();
  }

  @Get('trial-balance')
  @RequirePermission('accounting:view')
  trialBalance(@Query('asOf') asOf?: string) {
    return this.statements.trialBalance(asOf);
  }

  @Get('profit-loss')
  @RequirePermission('accounting:view')
  profitLoss(@Query('start') start?: string, @Query('end') end?: string) {
    return this.statements.profitAndLoss(start, end);
  }

  @Get('balance-sheet')
  @RequirePermission('accounting:view')
  balanceSheet(@Query('asOf') asOf?: string) {
    return this.statements.balanceSheet(asOf);
  }

  // Classified into operating / investing / financing. The original
  // /cash-flow endpoint is kept for the existing treasury view.
  @Get('cash-flow/classified')
  @RequirePermission('accounting:view')
  cashFlowClassified(@Query('start') start?: string, @Query('end') end?: string) {
    return this.statements.cashFlowClassified(start, end);
  }

  @Get('cash-flow')
  @RequirePermission('accounting:view')
  cashFlow(@Query('start') start?: string, @Query('end') end?: string) {
    return this.statements.cashFlow(start, end);
  }

  // ── Period close / lock ─────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermission('accounting:view')
  listPeriods() {
    return this.periods.listClosedPeriods();
  }

  @Post('periods/:period/close')
  @HttpCode(200)
  @RequirePermission('accounting:manage')
  closePeriod(@Param('period') period: string) {
    return this.periods.closePeriod(period);
  }

  // Year-end close: zeroes P&L into Retained Earnings and locks all 12 months.
  @Post('fiscal-years/:year/close')
  @HttpCode(200)
  @RequirePermission('accounting:manage')
  closeFiscalYear(@Param('year') year: string, @CurrentUser() user: AuthUser) {
    return this.fiscalYear.closeFiscalYear(Number(year), user.id);
  }

  @Post('periods/:period/reopen')
  @HttpCode(200)
  @RequirePermission('accounting:manage')
  reopenPeriod(@Param('period') period: string) {
    return this.periods.reopenPeriod(period);
  }
}
