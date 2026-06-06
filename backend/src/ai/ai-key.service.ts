import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { encryptSecret, decryptSecret } from '../common/crypto.util';
import { AiProvider, DEFAULT_MODELS } from './providers';

export interface AiConfig {
  provider: AiProvider;
  model: string;
  enabled: boolean;
}

@Injectable()
export class AiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  /** Public, non-secret config + which providers have a workspace key + the user's own overrides. */
  async getConfig(userId: string) {
    const ws = await this.workspaceConfig.get();
    const cfg = (ws.aiConfig as Partial<AiConfig>) ?? {};
    const provider = (cfg.provider as AiProvider) ?? 'anthropic';
    const [wsKeys, userKeys] = await Promise.all([
      this.prisma.aiKey.findMany({ where: { scope: 'workspace' }, select: { provider: true } }),
      this.prisma.aiKey.findMany({ where: { scope: 'user', userId }, select: { provider: true } }),
    ]);
    return {
      provider,
      model: cfg.model || DEFAULT_MODELS[provider],
      enabled: cfg.enabled ?? false,
      workspaceProviders: wsKeys.map((k) => k.provider),
      userProviders: userKeys.map((k) => k.provider),
      defaultModels: DEFAULT_MODELS,
    };
  }

  async setConfig(patch: Partial<{ provider: string; model: string; enabled: boolean }>) {
    const ws = await this.workspaceConfig.get();
    const cfg = { ...((ws.aiConfig as object) ?? {}), ...patch };
    await this.prisma.workspaceConfig.update({ where: { id: ws.id }, data: { aiConfig: cfg as Prisma.InputJsonValue } });
    this.workspaceConfig.invalidate();
    return cfg;
  }

  /** Upsert an encrypted key (workspace default or per-user override). */
  async setKey(provider: AiProvider, rawKey: string, scope: 'workspace' | 'user', userId?: string) {
    const where = { scope, provider, userId: scope === 'user' ? userId ?? null : null };
    const existing = await this.prisma.aiKey.findFirst({ where });
    const encKey = encryptSecret(rawKey);
    if (existing) {
      await this.prisma.aiKey.update({ where: { id: existing.id }, data: { encKey } });
    } else {
      await this.prisma.aiKey.create({ data: { provider, scope, userId: where.userId, encKey } });
    }
    return { provider, scope };
  }

  async removeKey(provider: AiProvider, scope: 'workspace' | 'user', userId?: string) {
    await this.prisma.aiKey.deleteMany({
      where: { scope, provider, userId: scope === 'user' ? userId ?? null : null },
    });
    return true;
  }

  /** Resolve the usable key for a provider: the user's override, else workspace. */
  async resolveKey(provider: AiProvider, userId: string): Promise<string | null> {
    const userKey = await this.prisma.aiKey.findFirst({ where: { scope: 'user', userId, provider } });
    const row = userKey ?? (await this.prisma.aiKey.findFirst({ where: { scope: 'workspace', provider } }));
    if (!row) return null;
    try {
      return decryptSecret(row.encKey);
    } catch {
      return null;
    }
  }
}
