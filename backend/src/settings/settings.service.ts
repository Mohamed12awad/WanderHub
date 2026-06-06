import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { CurrencyService } from '../common/currency.service';
import { encryptSecret as encrypt, decryptSecret as decrypt } from '../common/crypto.util';

const ALLOWED_SEQ_KEYS = ['invoice', 'quote', 'salesOrder', 'po', 'bill', 'expense'] as const;

// ── Workspace config validation ───────────────────────────────────────────────
// The fieldGroups / moduleSettings JSON drives dynamic forms and module gating
// across the app, so the write path is schema-validated rather than stored as
// raw `unknown`. Definitions stay permissive (most props optional) for
// backward-compatibility with older saved configs.

const FIELD_TYPES = [
  'text', 'textarea', 'number', 'date', 'select', 'boolean', 'email', 'phone', 'url',
] as const;

const fieldDefSchema = z.object({
  id: z.string().min(1, 'Field id is required'),
  name: z.string().optional(),
  label: z.string().optional(),
  type: z.enum(FIELD_TYPES).optional(),
  required: z.boolean().optional(),
  filterable: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  options: z.string().optional(),
  order: z.number().optional(),
  multiselect: z.boolean().optional(),
  defaultValue: z.string().optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  maxLength: z.number().optional(),
});

const fieldGroupsSchema = z.array(
  z.object({
    module: z.string().min(1),
    fields: z.array(fieldDefSchema).superRefine((fields, ctx) => {
      const ids = fields.map((f) => f.id);
      const dup = ids.find((id, i) => ids.indexOf(id) !== i);
      if (dup) ctx.addIssue({ code: 'custom', message: `Duplicate field id "${dup}"` });
    }),
  }),
);

const moduleSettingsSchema = z.array(
  z.object({ module: z.string().min(1), enabled: z.boolean() }),
);

const pipelineStagesSchema = z.array(z.any());

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
    throw new BadRequestException(`Invalid ${label}: ${msg}`);
  }
  return result.data;
}

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

  // ── Approvals ───────────────────────────────────────────────────────────────

  async getApprovals() {
    const config = await this.getOrCreate();
    return config.approvals;
  }

  async updateApprovals(approvals: unknown) {
    const config = await this.getOrCreate();
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: { approvals: approvals as Prisma.InputJsonValue },
    });
    this.workspaceConfig.invalidate();
    return updated.approvals;
  }

  // ── Workspace ────────────────────────────────────────────────────────────────

  async getWorkspace() {
    const config = await this.getOrCreate();
    return {
      fieldGroups: config.fieldGroups,
      moduleSettings: config.moduleSettings,
      pipelineStages: config.pipelineStages,
    };
  }

  async updateWorkspace(body: {
    fieldGroups?: unknown;
    moduleSettings?: unknown;
    pipelineStages?: unknown;
  }) {
    const config = await this.getOrCreate();
    const data: Record<string, unknown> = {};
    if (body.fieldGroups !== undefined) {
      data.fieldGroups = parseOrThrow(fieldGroupsSchema, body.fieldGroups, 'fieldGroups');
    }
    if (body.moduleSettings !== undefined) {
      data.moduleSettings = parseOrThrow(moduleSettingsSchema, body.moduleSettings, 'moduleSettings');
    }
    if (body.pipelineStages !== undefined) {
      data.pipelineStages = parseOrThrow(pipelineStagesSchema, body.pipelineStages, 'pipelineStages');
    }
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: data as Prisma.WorkspaceConfigUncheckedUpdateInput,
    });
    this.workspaceConfig.invalidate();
    return {
      fieldGroups: updated.fieldGroups,
      moduleSettings: updated.moduleSettings,
      pipelineStages: updated.pipelineStages,
    };
  }

  // ── Organization ─────────────────────────────────────────────────────────────

  async getOrganization() {
    const config = await this.getOrCreate();
    return { baseCurrency: config.baseCurrency, locale: config.locale };
  }

  async updateOrganization(body: { baseCurrency?: string; locale?: string }) {
    const config = await this.getOrCreate();
    const data: Record<string, unknown> = {};
    if (body.baseCurrency) data.baseCurrency = body.baseCurrency;
    if (body.locale) data.locale = body.locale;
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: data as Prisma.WorkspaceConfigUncheckedUpdateInput,
    });
    this.workspaceConfig.invalidate();
    this.currency.invalidate();
    return { baseCurrency: updated.baseCurrency, locale: updated.locale };
  }

  // ── Exchange Rates ────────────────────────────────────────────────────────────

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

  // ── Number Sequences ─────────────────────────────────────────────────────────

  async getNumberSequences() {
    return this.prisma.numberSequence.findMany({
      where: { key: { in: [...ALLOWED_SEQ_KEYS] } },
      orderBy: { key: 'asc' },
    });
  }

  async updateNumberSequence(
    key: string,
    body: { prefix?: string; padLength?: number; separator?: string },
  ) {
    if (!(ALLOWED_SEQ_KEYS as readonly string[]).includes(key)) {
      throw new NotFoundException(`Unknown sequence key: ${key}`);
    }
    return this.prisma.numberSequence.upsert({
      where: { key },
      update: {
        ...(body.prefix !== undefined ? { prefix: body.prefix } : {}),
        ...(body.padLength !== undefined ? { padLength: body.padLength } : {}),
        ...(body.separator !== undefined ? { separator: body.separator } : {}),
      },
      create: {
        key,
        prefix: body.prefix ?? '',
        padLength: body.padLength ?? 4,
        separator: body.separator ?? '-',
      },
    });
  }

  // ── Invoice Defaults ─────────────────────────────────────────────────────────

  async getInvoiceDefaults() {
    const config = await this.getOrCreate();
    return config.invoiceDefaults;
  }

  async updateInvoiceDefaults(body: {
    paymentTermsDays?: number;
    notes?: string;
    terms?: string;
    quotesValidDays?: number;
  }) {
    const config = await this.getOrCreate();
    const existing = (config.invoiceDefaults as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...body };
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: { invoiceDefaults: merged as Prisma.InputJsonValue },
    });
    return updated.invoiceDefaults;
  }

  // ── Tax Rates ─────────────────────────────────────────────────────────────────

  async getTaxRates() {
    return this.prisma.taxRate.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createTaxRate(body: { name: string; rate: number; isDefault?: boolean }) {
    if (body.isDefault) {
      await this.prisma.taxRate.updateMany({ data: { isDefault: false } });
    }
    return this.prisma.taxRate.create({ data: body as Prisma.TaxRateUncheckedCreateInput });
  }

  async updateTaxRate(id: string, body: { name?: string; rate?: number; isDefault?: boolean }) {
    if (body.isDefault) {
      await this.prisma.taxRate.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }
    return this.prisma.taxRate.update({ where: { id }, data: body as Prisma.TaxRateUncheckedUpdateInput });
  }

  async deleteTaxRate(id: string) {
    await this.prisma.taxRate.delete({ where: { id } });
  }

  // ── Password Policy ───────────────────────────────────────────────────────────

  async getPasswordPolicy() {
    const config = await this.getOrCreate();
    return config.passwordPolicy;
  }

  async updatePasswordPolicy(body: {
    minLength?: number;
    requireUppercase?: boolean;
    requireNumber?: boolean;
    requireSymbol?: boolean;
  }) {
    const config = await this.getOrCreate();
    const existing = (config.passwordPolicy as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...body };
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: { passwordPolicy: merged as Prisma.InputJsonValue },
    });
    return updated.passwordPolicy;
  }

  // ── Email / SMTP Config ───────────────────────────────────────────────────────

  async getEmailConfig() {
    const config = await this.prisma.smtpConfig.findFirst();
    if (!config) return {};
    return {
      id: config.id,
      host: config.host,
      port: config.port,
      user: config.user,
      password: '••••••••',
      fromName: config.fromName,
      fromEmail: config.fromEmail,
    };
  }

  async updateEmailConfig(body: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    fromName?: string;
    fromEmail?: string;
  }) {
    const existing = await this.prisma.smtpConfig.findFirst();
    const encPass = body.password ? encrypt(body.password) : undefined;

    if (existing) {
      return this.prisma.smtpConfig.update({
        where: { id: existing.id },
        data: {
          ...(body.host !== undefined ? { host: body.host } : {}),
          ...(body.port !== undefined ? { port: body.port } : {}),
          ...(body.user !== undefined ? { user: body.user } : {}),
          ...(encPass !== undefined ? { encPass } : {}),
          ...(body.fromName !== undefined ? { fromName: body.fromName } : {}),
          ...(body.fromEmail !== undefined ? { fromEmail: body.fromEmail } : {}),
        },
        select: { id: true, host: true, port: true, user: true, fromName: true, fromEmail: true },
      });
    }

    return this.prisma.smtpConfig.create({
      data: {
        host: body.host ?? '',
        port: body.port ?? 587,
        user: body.user ?? '',
        encPass: encPass ?? encrypt(''),
        fromName: body.fromName,
        fromEmail: body.fromEmail,
      },
      select: { id: true, host: true, port: true, user: true, fromName: true, fromEmail: true },
    });
  }

  async testEmailConfig() {
    const config = await this.prisma.smtpConfig.findFirst();
    if (!config) throw new NotFoundException('SMTP not configured.');
    // The actual send is handled by EmailOutbox / NotificationDispatcher.
    // For a test, we enqueue a one-off message to trigger the send path.
    const plain = decrypt(config.encPass);
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: plain },
    });
    await transporter.sendMail({
      from: config.fromEmail ? `"${config.fromName ?? ''}" <${config.fromEmail}>` : config.user,
      to: config.user,
      subject: 'NawaHub — SMTP test',
      text: 'Your email configuration is working correctly.',
    });
    return { ok: true };
  }
}
