import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermission('deals:view')
  async findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json(await this.deals.findAll(query, user)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('deals:view')
  async findOne(@Param('id') id: string, @Query('includePayments') includePayments: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const data = await this.deals.findOne(id, includePayments === 'true', user);
      if (!data) return res.status(404).json({ message: 'Deal not found' });
      return res.json(data);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('deals:create')
  async create(@Body() body: CreateDealDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.deals.create(body, user.id)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('deals:edit')
  async update(@Param('id') id: string, @Body() body: UpdateDealDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const deal = await this.deals.update(id, body, user.id);
      if (!deal) return res.status(404).json({ message: 'Deal not found' });
      return res.json(deal);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('deals:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.deals.remove(id);
      if (!ok) return res.status(404).json({ message: 'Deal not found' });
      return res.json({ message: 'Deal deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post(':id/create-quote')
  @RequirePermission('finance:create')
  async createQuote(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const quote = await this.deals.createQuoteFromDeal(id, user.id);
      if (!quote) return res.status(404).json({ message: 'Deal not found' });
      return res.status(201).json(quote);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
