import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SampleDataService } from './sample-data.service';

/**
 * Demo-data management, surfaced in the UI at Settings → Danger Zone. Both
 * actions are workspace-altering, so they require `settings:manage`.
 */
@Controller('settings/sample-data')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SampleDataController {
  constructor(private readonly sampleData: SampleDataService) {}

  /** Load (or top up) the sample dataset. Idempotent. */
  @Post('load')
  @RequirePermission('settings:manage')
  load() {
    return this.sampleData.load();
  }

  /** Remove every sample record. Real, user-created data is untouched. */
  @Post('clear')
  @RequirePermission('settings:manage')
  clear() {
    return this.sampleData.clear();
  }
}
