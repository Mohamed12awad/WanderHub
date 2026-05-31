import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  findAll(@Query() query: Record<string, string>) {
    return this.logs.findAll(query);
  }
}
