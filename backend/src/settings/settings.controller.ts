import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // ── Approvals ───────────────────────────────────────────────────────────────

  @Get('approvals')
  @RequirePermission('settings:view')
  getApprovals() {
    return this.settings.getApprovals();
  }

  @Put('approvals')
  @RequirePermission('settings:manage')
  updateApprovals(@Body() body: { approvals: unknown }) {
    return this.settings.updateApprovals(body.approvals);
  }

  // ── Workspace (fields, modules, pipeline stages) ────────────────────────────

  @Get('workspace')
  @RequirePermission('settings:view')
  getWorkspace() {
    return this.settings.getWorkspace();
  }

  @Put('workspace')
  @RequirePermission('settings:manage')
  updateWorkspace(
    @Body() body: { fieldGroups?: unknown; moduleSettings?: unknown; pipelineStages?: unknown },
  ) {
    return this.settings.updateWorkspace(body);
  }

  // ── Organization ────────────────────────────────────────────────────────────

  @Get('organization')
  @RequirePermission('settings:view')
  getOrganization() {
    return this.settings.getOrganization();
  }

  @Put('organization')
  @RequirePermission('settings:manage')
  updateOrganization(@Body() body: { baseCurrency?: string; locale?: string }) {
    return this.settings.updateOrganization(body);
  }

  // ── Exchange Rates ──────────────────────────────────────────────────────────

  @Get('exchange-rates')
  @RequirePermission('settings:view')
  getExchangeRates() {
    return this.settings.getExchangeRates();
  }

  @Put('exchange-rates')
  @RequirePermission('settings:manage')
  upsertExchangeRate(@Body() body: { currency: string; rate: number; asOf?: string }) {
    return this.settings.upsertExchangeRate(body);
  }

  // ── Number Sequences ────────────────────────────────────────────────────────

  @Get('number-sequences')
  @RequirePermission('settings:view')
  getNumberSequences() {
    return this.settings.getNumberSequences();
  }

  @Put('number-sequences/:key')
  @RequirePermission('settings:manage')
  updateNumberSequence(
    @Param('key') key: string,
    @Body() body: { prefix?: string; padLength?: number; separator?: string },
  ) {
    return this.settings.updateNumberSequence(key, body);
  }

  // ── Invoice Defaults ────────────────────────────────────────────────────────

  @Get('invoice-defaults')
  @RequirePermission('settings:view')
  getInvoiceDefaults() {
    return this.settings.getInvoiceDefaults();
  }

  @Put('invoice-defaults')
  @RequirePermission('settings:manage')
  updateInvoiceDefaults(
    @Body() body: { paymentTermsDays?: number; notes?: string; terms?: string; quotesValidDays?: number },
  ) {
    return this.settings.updateInvoiceDefaults(body);
  }

  // ── Tax Rates ───────────────────────────────────────────────────────────────

  @Get('tax-rates')
  @RequirePermission('settings:view')
  getTaxRates() {
    return this.settings.getTaxRates();
  }

  @Post('tax-rates')
  @RequirePermission('settings:manage')
  createTaxRate(@Body() body: { name: string; rate: number; isDefault?: boolean }) {
    return this.settings.createTaxRate(body);
  }

  @Patch('tax-rates/:id')
  @RequirePermission('settings:manage')
  updateTaxRate(
    @Param('id') id: string,
    @Body() body: { name?: string; rate?: number; isDefault?: boolean },
  ) {
    return this.settings.updateTaxRate(id, body);
  }

  @Delete('tax-rates/:id')
  @RequirePermission('settings:manage')
  deleteTaxRate(@Param('id') id: string) {
    return this.settings.deleteTaxRate(id);
  }

  // ── Password Policy ─────────────────────────────────────────────────────────

  @Get('password-policy')
  @RequirePermission('settings:view')
  getPasswordPolicy() {
    return this.settings.getPasswordPolicy();
  }

  @Put('password-policy')
  @RequirePermission('settings:manage')
  updatePasswordPolicy(
    @Body() body: {
      minLength?: number;
      requireUppercase?: boolean;
      requireNumber?: boolean;
      requireSymbol?: boolean;
    },
  ) {
    return this.settings.updatePasswordPolicy(body);
  }

  // ── Email / SMTP Config ─────────────────────────────────────────────────────

  @Get('email-config')
  @RequirePermission('settings:manage')
  getEmailConfig() {
    return this.settings.getEmailConfig();
  }

  @Put('email-config')
  @RequirePermission('settings:manage')
  updateEmailConfig(
    @Body() body: {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      fromName?: string;
      fromEmail?: string;
    },
  ) {
    return this.settings.updateEmailConfig(body);
  }

  @Post('email-config/test')
  @RequirePermission('settings:manage')
  testEmailConfig() {
    return this.settings.testEmailConfig();
  }
}
