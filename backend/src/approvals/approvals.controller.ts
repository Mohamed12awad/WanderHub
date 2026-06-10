import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ApprovalService } from '../common/approval.service';
import { LinkedAccessService } from '../common/linked-access.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(
    private readonly approvals: ApprovalService,
    private readonly linkedAccess: LinkedAccessService,
  ) {}

  @Get(':entityType/:entityId/steps')
  async steps(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.linkedAccess.assertCanAccess(user, entityType, entityId);
    return this.approvals.listSteps(entityType, entityId);
  }
}
