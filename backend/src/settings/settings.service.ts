import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { CurrencyService } from '../common/currency.service';

const ALLOWED_SEQ_KEYS = ['invoice', 'quote', 'po', 'bill', 'expense'] as const;

// AES-256-GCM encryption for SMTP password using JWT_SECRET as key material.
const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12B) + tag(16B) + ciphertext, all base64-encoded as single string
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final('utf8');
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
      data: { approvals: approvals as any },
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
    if (body.fieldGroups !== undefined) data.fieldGroups = body.fieldGroups;
    if (body.moduleSettings !== undefined) data.moduleSettings = body.moduleSettings;
    if (body.pipelineStages !== undefined) data.pipelineStages = body.pipelineStages;
    const updated = await this.prisma.workspaceConfig.update({
      where: { id: config.id },
      data: data as any,
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
      data: data as any,
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
    if (!ALLOWED_SEQ_KEYS.includes(key as any)) {
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
      data: { invoiceDefaults: merged as any },
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
    return this.prisma.taxRate.create({ data: body as any });
  }

  async updateTaxRate(id: string, body: { name?: string; rate?: number; isDefault?: boolean }) {
    if (body.isDefault) {
      await this.prisma.taxRate.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }
    return this.prisma.taxRate.update({ where: { id }, data: body as any });
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
      data: { passwordPolicy: merged as any },
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
