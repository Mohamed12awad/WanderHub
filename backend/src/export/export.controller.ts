import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  /**
   * GET /export/:entity — streams the full dataset for `entity` as a CSV
   * attachment. The per-entity view permission is enforced inside the service
   * (it also applies the user's ownership scope), so the response includes every
   * record the caller may see — not just the rows currently loaded in the UI.
   */
  @Get(':entity')
  exportCsv(
    @Param('entity') entity: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    return this.exporter.streamCsv(entity, user, res);
  }
}
