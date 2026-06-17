import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SummaryService } from './summary.service';

@Controller('summary')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('reports:view')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get()
  getSummary(
    @Query('timePeriod') timePeriod: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.summary.getSummary(timePeriod, startDate, endDate);
  }

  @Get('pending-approvals')
  pendingApprovals() {
    return this.summary.getPendingApprovals();
  }
}
