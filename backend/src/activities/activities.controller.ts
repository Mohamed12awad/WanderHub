import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.activities.findAll(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  async create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.activities.create(body, user.id)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const a = await this.activities.update(id, body);
      if (!a) return res.status(404).json({ message: 'Activity not found' });
      return res.json(a);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.activities.remove(id);
      if (!ok) return res.status(404).json({ message: 'Activity not found' });
      return res.json({ message: 'Activity deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
