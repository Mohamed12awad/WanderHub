import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Resource } from '../common/resources';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { AiKeyService, AiConfig } from './ai-key.service';
import { AiProvider, DEFAULT_MODELS, callProvider } from './providers';

const ENTITY_BASE: Record<string, { base: Resource; model: 'Customer' | 'Deal' | 'Lead' }> = {
  customers: { base: 'contacts', model: 'Customer' },
  deals: { base: 'deals', model: 'Deal' },
  leads: { base: 'leads', model: 'Lead' },
};

const SUMMARY_SYSTEM =
  'You are a CRM assistant. Summarize the record for a busy salesperson in 4-6 short bullet points: who they are, current status/value, recent activity, risks, and a concrete suggested next action. Be specific and concise. Plain text only.';

const SCORE_SYSTEM =
  'You are a CRM assistant that scores sales likelihood. Respond ONLY with minified JSON: {"score": <0-100 integer>, "rating": "hot"|"warm"|"cold", "rationale": "<one sentence>"}. No prose, no code fences.';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly aiKeys: AiKeyService,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  async summarize(entity: string, id: string, user: AuthUser) {
    const context = await this.buildContext(entity, id, user);
    const { provider, model, text } = await this.run(user, SUMMARY_SYSTEM, context);
    return { provider, model, summary: text };
  }

  async score(entity: string, id: string, user: AuthUser) {
    if (entity === 'customers') {
      throw new BadRequestException('Scoring applies to leads and deals.');
    }
    const context = await this.buildContext(entity, id, user);
    const { provider, model, text } = await this.run(user, SCORE_SYSTEM, context);
    const parsed = this.parseScore(text);
    return { provider, model, ...parsed, raw: text };
  }

  // ── internals ───────────────────────────────────────────────────────────────

  private async run(user: AuthUser, system: string, prompt: string) {
    const ws = await this.workspaceConfig.get();
    const cfg = (ws.aiConfig as Partial<AiConfig>) ?? {};
    const provider = (cfg.provider as AiProvider) ?? 'anthropic';
    const model = cfg.model || DEFAULT_MODELS[provider];
    const key = await this.aiKeys.resolveKey(provider, user.id);
    if (!key) {
      throw new BadRequestException('AI is not configured. Add an API key in Settings → AI.');
    }
    try {
      const text = await callProvider(provider, model, key, system, prompt);
      return { provider, model, text };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      throw new BadRequestException(`AI request failed: ${message}`);
    }
  }

  private assert(user: AuthUser, base: string) {
    const required = `${base}:view`;
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === required || p.startsWith(`${required}:`));
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
  }

  private parseScore(text: string) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const obj = JSON.parse(match ? match[0] : text);
      return {
        score: typeof obj.score === 'number' ? obj.score : null,
        rating: ['hot', 'warm', 'cold'].includes(obj.rating) ? obj.rating : null,
        rationale: typeof obj.rationale === 'string' ? obj.rationale : '',
      };
    } catch {
      return { score: null, rating: null, rationale: text.slice(0, 200) };
    }
  }

  /** Builds a compact text context for the record, enforcing the user's view scope. */
  private async buildContext(entity: string, id: string, user: AuthUser): Promise<string> {
    const cfg = ENTITY_BASE[entity];
    if (!cfg) throw new NotFoundException(`Unsupported entity: ${entity}`);
    this.assert(user, cfg.base);
    const scopeWhere = await this.visibility.ownershipWhere(user, cfg.base, 'ownerId');

    const [activities, notes] = await Promise.all([
      this.prisma.activity.findMany({
        where: { linkedToId: id, linkedModel: cfg.model },
        orderBy: { date: 'desc' }, take: 8,
        select: { type: true, title: true, description: true, date: true, status: true },
      }),
      this.prisma.note.findMany({
        where: { linkedToId: id, linkedModel: cfg.model },
        orderBy: { createdAt: 'desc' }, take: 8,
        select: { content: true, createdAt: true },
      }),
    ]);
    const lines: string[] = [];

    if (entity === 'customers') {
      const c = await this.prisma.customer.findFirst({
        where: { id, deletedAt: null, ...scopeWhere },
        include: { deals: { where: { deletedAt: null }, select: { title: true, status: true, price: true, currency: true } } },
      });
      if (!c) throw new NotFoundException('Customer not found');
      lines.push(`Contact: ${c.name}`, `Status: ${c.status ?? '—'}`, `Email: ${c.email ?? '—'} | Phone: ${c.phone}`, `Location: ${c.location ?? '—'}`);
      if (c.deals.length) lines.push(`Deals: ${c.deals.map((d) => `${d.title} (${d.status}, ${d.price} ${d.currency})`).join('; ')}`);
      if (c.notes) lines.push(`Notes: ${c.notes}`);
    } else if (entity === 'deals') {
      const d = await this.prisma.deal.findFirst({
        where: { id, deletedAt: null, ...scopeWhere },
        include: { customer: { select: { name: true } } },
      });
      if (!d) throw new NotFoundException('Deal not found');
      lines.push(
        `Deal: ${d.title}`, `Customer: ${d.customer?.name ?? '—'}`,
        `Status: ${d.status} | Priority: ${d.priority ?? '—'} | Probability: ${d.probability ?? '—'}%`,
        `Value: ${d.price} ${d.currency}`,
        `Expected close: ${d.expectedCloseDate?.toISOString().slice(0, 10) ?? '—'}`,
      );
      if (d.notes) lines.push(`Notes: ${d.notes}`);
    } else {
      const l = await this.prisma.lead.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
      if (!l) throw new NotFoundException('Lead not found');
      lines.push(
        `Lead: ${l.name}`, `Company: ${l.company ?? '—'} | Title: ${l.jobTitle ?? '—'}`,
        `Status: ${l.status} | Rating: ${l.rating ?? '—'}`,
        `Source: ${l.source ?? '—'} | Budget: ${l.budget ?? '—'} ${l.currency ?? ''}`,
        `Email: ${l.email ?? '—'} | Phone: ${l.phone ?? '—'}`,
      );
      if (l.notes) lines.push(`Notes: ${l.notes}`);
    }

    if (activities.length) {
      lines.push('Recent activities:');
      for (const a of activities) {
        lines.push(`- [${a.date.toISOString().slice(0, 10)}] ${a.type}/${a.status}: ${a.title}${a.description ? ` — ${a.description}` : ''}`);
      }
    }
    if (notes.length) {
      lines.push('Recent notes:');
      for (const n of notes) lines.push(`- ${n.content}`);
    }
    return lines.join('\n');
  }
}
