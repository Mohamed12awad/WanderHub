import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SummeryService } from './summery.service';

@Controller('summery')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('reports:view')
export class SummeryController {
  constructor(private readonly summery: SummeryService) {}

  @Get()
  getSummery(@Query('timePeriod') timePeriod: string) {
    return this.summery.getSummery(timePeriod);
  }

  @Get('pending-approvals')
  pendingApprovals() {
    return this.summery.getPendingApprovals();
  }
}
