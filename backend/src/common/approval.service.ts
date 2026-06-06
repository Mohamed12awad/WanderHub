import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from './workspace-config.service';

export type ApprovalDecision = 'approve' | 'reject';
export type OverallStatus = 'pending' | 'approved' | 'rejected';

interface StepConfig {
  approverRoles: string[];
  minAmount?: number;
}
interface ModuleConfig {
  module: string;
  enabled?: boolean;
  approverRoles?: string[];
  steps?: StepConfig[];
}

// Accepts either the Prisma client or an interactive-transaction client.
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Multi-step approval engine shared by finance/procurement/expenses.
 *
 * Config lives in WorkspaceConfig.approvals as
 *   { module, enabled, approverRoles }                       ← legacy single step
 *   { module, enabled, steps: [{ approverRoles, minAmount }] } ← ordered chain
 *
 * Both shapes are supported: with no `steps`, a single step is derived from
 * `approverRoles`, so existing single-approver workspaces are unchanged.
 */
@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  private async getConfig(module: string): Promise<ModuleConfig | undefined> {
    const config = await this.workspaceConfig.get();
    const approvals = (config.approvals as unknown as ModuleConfig[]) ?? [];
    return approvals.find((c) => c.module === module);
  }

  async isEnabled(module: string): Promise<boolean> {
    return !!(await this.getConfig(module))?.enabled;
  }

  /** The ordered steps that apply to `amount` for this module. */
  private resolveSteps(cfg: ModuleConfig | undefined, amount: number): StepConfig[] {
    if (!cfg?.enabled) return [];
    if (cfg.steps?.length) return cfg.steps.filter((s) => amount >= (s.minAmount ?? 0));
    return [{ approverRoles: cfg.approverRoles ?? [] }];
  }

  /**
   * Generates approval steps for an entity. Returns the resulting overall
   * status: 'pending' if any step is required, otherwise 'approved' (e.g. the
   * amount fell below every configured threshold).
   */
  async initSteps(db: Db, entityType: string, entityId: string, module: string, amount: number): Promise<OverallStatus> {
    const cfg = await this.getConfig(module);
    const steps = this.resolveSteps(cfg, amount);
    if (!steps.length) return 'approved';
    await db.approvalStep.createMany({
      data: steps.map((s, idx) => ({
        entityType,
        entityId,
        sequence: idx,
        approverRoles: s.approverRoles ?? [],
        status: 'pending',
      })),
    });
    return 'pending';
  }

  /** Drops an entity's steps (used when a document is edited and re-submitted). */
  async resetSteps(db: Db, entityType: string, entityId: string): Promise<void> {
    await db.approvalStep.deleteMany({ where: { entityType, entityId } });
  }

  async listSteps(entityType: string, entityId: string) {
    return this.prisma.approvalStep.findMany({
      where: { entityType, entityId },
      orderBy: { sequence: 'asc' },
    });
  }

  private canActOnStep(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    if (!approverRoles.length) return false; // enabled but no roles ⇒ admins only
    return approverRoles.includes(userRole);
  }

  /**
   * Applies a decision to the entity's current pending step. Enforces
   * separation of duties (the creator can never act) and returns the new
   * overall status plus the acting user when a final decision is reached.
   */
  async act(
    entityType: string,
    entityId: string,
    userId: string,
    userRole: string,
    creatorId: string | null | undefined,
    decision: ApprovalDecision,
    comment?: string,
  ): Promise<{ status: OverallStatus; finalApproverId?: string }> {
    // Separation of duties: the creator can't act on their own item — except
    // Super Admin, the unrestricted override role.
    if (creatorId && creatorId === userId && userRole !== 'super admin') {
      throw new ForbiddenException(`You cannot ${decision} an item you created`);
    }
    const steps = await this.listSteps(entityType, entityId);
    const current = steps.find((s) => s.status === 'pending');
    if (!current) {
      const rejected = steps.some((s) => s.status === 'rejected');
      return { status: rejected ? 'rejected' : 'approved' };
    }
    if (!this.canActOnStep(current.approverRoles, userRole)) {
      throw new ForbiddenException('You are not authorized to act on this approval step');
    }

    if (decision === 'reject') {
      await this.prisma.approvalStep.update({
        where: { id: current.id },
        data: { status: 'rejected', actedById: userId, actedAt: new Date(), comment },
      });
      return { status: 'rejected', finalApproverId: userId };
    }

    await this.prisma.approvalStep.update({
      where: { id: current.id },
      data: { status: 'approved', actedById: userId, actedAt: new Date(), comment },
    });
    const remaining = steps.filter((s) => s.id !== current.id && s.status === 'pending').length;
    return remaining > 0 ? { status: 'pending', finalApproverId: userId } : { status: 'approved', finalApproverId: userId };
  }
}
