import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('approvals')
  @RequirePermission('settings:view')
  getApprovals() {
    return this.settings.getApprovals();
  }

  @Put('approvals')
  @RequirePermission('settings:manage')
  updateApprovals(@Body() body: { approvals: unknown }) {
    return this.settings.updateApprovals(body.approvals);
  }

  @Get('workspace')
  @RequirePermission('settings:view')
  getWorkspace() {
    return this.settings.getWorkspace();
  }

  @Put('workspace')
  @RequirePermission('settings:manage')
  updateWorkspace(@Body() body: { fieldGroups?: unknown; moduleSettings?: unknown }) {
    return this.settings.updateWorkspace(body);
  }

  @Get('organization')
  @RequirePermission('settings:view')
  getOrganization() {
    return this.settings.getOrganization();
  }

  @Put('organization')
  @RequirePermission('settings:manage')
  updateOrganization(@Body() body: { baseCurrency?: string; locale?: string }) {
    return this.settings.updateOrganization(body);
  }

  @Get('exchange-rates')
  @RequirePermission('settings:view')
  getExchangeRates() {
    return this.settings.getExchangeRates();
  }

  @Put('exchange-rates')
  @RequirePermission('settings:manage')
  upsertExchangeRate(@Body() body: { currency: string; rate: number; asOf?: string }) {
    return this.settings.upsertExchangeRate(body);
  }
}
