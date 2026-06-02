import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalService } from '../common/approval.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalService) {}

  /** Approval chain (steps + their status) for any entity. */
  @Get(':entityType/:entityId/steps')
  steps(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.approvals.listSteps(entityType, entityId);
  }
}
