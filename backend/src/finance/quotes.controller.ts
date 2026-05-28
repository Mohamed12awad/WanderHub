import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { handlePrismaError } from '../common/prisma-error';

@Controller('finance/quotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QuotesController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  @RequirePermission('finance:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.finance.getQuotes(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('finance:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const q = await this.finance.getQuoteById(id);
      if (!q) return res.status(404).json({ message: 'Quote not found' });
      return res.json(q);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('finance:create')
  async create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.finance.createQuote(body, user.id)); }
    catch (e) { return handlePrismaError(e, res); }
  }

  @Put(':id')
  @RequirePermission('finance:edit')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const q = await this.finance.updateQuote(id, body);
      if (!q) return res.status(404).json({ message: 'Quote not found' });
      return res.json(q);
    } catch (e) { return handlePrismaError(e, res); }
  }

  @Delete(':id')
  @RequirePermission('finance:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.finance.deleteQuote(id);
      if (!ok) return res.status(404).json({ message: 'Quote not found' });
      return res.json({ message: 'Quote deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch(':id/approve')
  @RequirePermission('finance:approve')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const q = await this.finance.approveQuote(id, user.id, user.role);
      if (!q) return res.status(404).json({ message: 'Quote not found' });
      if ((q as any).forbidden) return res.status(403).json({ message: 'You are not authorized to approve quotes' });
      return res.json(q);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch(':id/reject')
  @RequirePermission('finance:approve')
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser, @Res() res: Response) {
    if (!body.reason?.trim()) return res.status(400).json({ message: 'Rejection reason is required' });
    try {
      const q = await this.finance.rejectQuote(id, user.id, body.reason.trim(), user.role);
      if (!q) return res.status(404).json({ message: 'Quote not found' });
      if ((q as any).forbidden) return res.status(403).json({ message: 'You are not authorized to reject quotes' });
      return res.json(q);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post(':id/convert')
  @RequirePermission('finance:create')
  async convert(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const result = await this.finance.convertQuoteToInvoice(id, user.id);
      if (!result) return res.status(404).json({ message: 'Quote not found' });
      if ((result as any).alreadyConverted) return res.status(400).json({ message: 'Quote already converted to invoice' });
      return res.status(201).json(result);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
