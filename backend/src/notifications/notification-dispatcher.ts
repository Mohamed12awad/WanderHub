import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

// Notification types that also warrant an email.
const EMAIL_TYPES = new Set([
  'approval_requested',
  'approval_approved',
  'approval_rejected',
  'invoice_overdue',
  'task_assigned',
  'lead_assigned',
  'deal_assigned',
]);

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT ?? '587'),
        secure: parseInt(SMTP_PORT ?? '587') === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      this.logger.log('Email transport configured');
    } else {
      this.logger.warn('SMTP_HOST/SMTP_USER/SMTP_PASS not set — email notifications disabled');
    }
  }

  async dispatch(payload: NotificationPayload): Promise<void> {
    // Always save to DB (in-app notification).
    await this.prisma.notification.create({ data: payload as any });

    // Optionally send email for high-signal event types.
    if (this.transporter && EMAIL_TYPES.has(payload.type)) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true },
      });
      if (user?.email) {
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@wanderhub.app';
        const appUrl = process.env.APP_URL ?? '';
        const actionUrl = payload.link ? `${appUrl}${payload.link}` : appUrl;

        try {
          await this.transporter.sendMail({
            from,
            to: user.email,
            subject: payload.title,
            html: buildEmailHtml({ name: user.name, title: payload.title, body: payload.body, actionUrl }),
          });
        } catch (err) {
          // Never let email failure break the in-app flow.
          this.logger.error(`Email delivery failed for user ${payload.userId}: ${(err as Error).message}`);
        }
      }
    }
  }

  /** Fire-and-forget variant — callers that don't need to await dispatch. */
  dispatchBackground(payload: NotificationPayload): void {
    this.dispatch(payload).catch((err) =>
      this.logger.error(`Background dispatch failed: ${(err as Error).message}`),
    );
  }
}

// ─── Minimal email template ───────────────────────────────────────────────────

function buildEmailHtml(opts: { name: string; title: string; body?: string; actionUrl: string }) {
  const { name, title, body, actionUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7">
        <tr><td style="background:#0f172a;padding:20px 32px">
          <span style="color:#fff;font-size:16px;font-weight:600">NawaHub</span>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:14px;color:#71717a">Hi ${escHtml(name)},</p>
          <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b">${escHtml(title)}</h1>
          ${body ? `<p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">${escHtml(body)}</p>` : ''}
          ${actionUrl ? `<a href="${escHtml(actionUrl)}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500">View in NawaHub</a>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f4f4f5">
          <p style="margin:0;font-size:12px;color:#a1a1aa">NawaHub CRM &mdash; you received this because you have notifications enabled.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Re-export for convenience so callers import from one place.
export type { NotificationPayload as CreateNotificationDto };
export { toClient };
