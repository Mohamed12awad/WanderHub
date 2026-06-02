import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { CurrencyService } from '../common/currency.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceConfig: WorkspaceConfigService,
    private readonly currency: CurrencyService,
  ) {}

  private async getOrCreate() {
    const existing = await this.prisma.workspaceConfig.findFirst();
    if (existing) return existing;
    return this.prisma.workspaceConfig.create({ data: {} });
  }

  async getApprovals() {
    const config = await this.getOrCreate();
    return config.approvals;
  }

  async updateApprovals(approvals: unknown) {
    const config = await this.getOrCreate();
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: { approvals: approvals as any },
    });
    this.workspaceConfig.invalidate();
    return updated.approvals;
  }

  async getWorkspace() {
    const config = await this.getOrCreate();
    return { fieldGroups: config.fieldGroups, moduleSettings: config.moduleSettings };
  }

  async updateWorkspace(body: { fieldGroups?: unknown; moduleSettings?: unknown }) {
    const config = await this.getOrCreate();
    const data: Record<string, unknown> = {};
    if (body.fieldGroups !== undefined) data.fieldGroups = body.fieldGroups;
    if (body.moduleSettings !== undefined) data.moduleSettings = body.moduleSettings;
    const updated = await this.prisma.workspaceConfig.update({ where: { id: config.id }, data: data as any });
    return { fieldGroups: updated.fieldGroups, moduleSettings: updated.moduleSettings };
  }

  async getOrganization() {
    const config = await this.getOrCreate();
    return { baseCurrency: config.baseCurrency, locale: config.locale };
  }

  async updateOrganization(body: { baseCurrency?: string; locale?: string }) {
    const config = await this.getOrCreate();
    const data: Record<string, unknown> = {};
    if (body.baseCurrency) data.baseCurrency = body.baseCurrency;
    if (body.locale) data.locale = body.locale;
    const updated = await this.prisma.workspaceConfig.update({ where: { id: config.id }, data: data as any });
    // Base-currency change affects every cached conversion.
    this.workspaceConfig.invalidate();
    this.currency.invalidate();
    return { baseCurrency: updated.baseCurrency, locale: updated.locale };
  }

  // ── Exchange rates ────────────────────────────────────────────────────────

  /** Latest manual exchange rate per currency, newest first. */
  async getExchangeRates() {
    const rows = await this.prisma.exchangeRate.findMany({ orderBy: { asOf: 'desc' } });
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.currency)) latest.set(r.currency, r);
    return [...latest.values()];
  }

  async upsertExchangeRate(body: { currency: string; rate: number; asOf?: string }) {
    const { baseCurrency } = await this.getOrganization();
    const created = await this.prisma.exchangeRate.create({
      data: {
        currency: body.currency,
        baseCurrency,
        rate: body.rate,
        ...(body.asOf ? { asOf: new Date(body.asOf) } : {}),
      },
    });
    this.currency.invalidate();
    return created;
  }
}
