import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SummeryService } from './summery.service';

@Controller('summery')
@UseGuards(JwtAuthGuard)
export class SummeryController {
  constructor(private readonly summery: SummeryService) {}

  @Get()
  async getSummery(@Query('timePeriod') timePeriod: string, @Res() res: Response) {
    try { return res.json(await this.summery.getSummery(timePeriod)); }
    catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }
}
