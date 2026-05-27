import { Body, Controller, Get, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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
  async getApprovals(@Res() res: Response) {
    try { return res.json(await this.settings.getApprovals()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put('approvals')
  @RequirePermission('settings:manage')
  async updateApprovals(@Body() body: { approvals: unknown }, @Res() res: Response) {
    try { return res.json(await this.settings.updateApprovals(body.approvals)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get('workspace')
  @RequirePermission('settings:view')
  async getWorkspace(@Res() res: Response) {
    try { return res.json(await this.settings.getWorkspace()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put('workspace')
  @RequirePermission('settings:manage')
  async updateWorkspace(@Body() body: { fieldGroups?: unknown; moduleSettings?: unknown }, @Res() res: Response) {
    try { return res.json(await this.settings.updateWorkspace(body)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
