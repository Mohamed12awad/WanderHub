import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @RequirePermission('logs:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try {
      return res.json(await this.logs.findAll(query));
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  }
}
