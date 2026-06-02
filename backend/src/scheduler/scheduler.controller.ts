import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CronGuard } from './cron.guard';

/**
 * Internal endpoint for platform crons (e.g. Vercel Cron) to trigger background
 * maintenance, since in-process timers don't run on serverless. Protected by a
 * shared secret rather than user auth.
 */
@Controller('internal/cron')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  // GET for Vercel Cron (which issues GET requests), POST for manual triggers.
  @Get('run')
  @UseGuards(CronGuard)
  runGet() {
    return this.scheduler.runMaintenance();
  }

  @Post('run')
  @UseGuards(CronGuard)
  run() {
    return this.scheduler.runMaintenance();
  }
}
