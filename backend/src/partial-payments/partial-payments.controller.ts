import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PartialPaymentsService } from './partial-payments.service';

@Controller('partialPayments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PartialPaymentsController {
  constructor(private readonly payments: PartialPaymentsService) {}

  @Get('booking/:bookingId')
  @RequirePermission('deals:view')
  async findByDeal(@Param('bookingId') bookingId: string, @Res() res: Response) {
    try { return res.json(await this.payments.findByDeal(bookingId)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('deals:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const p = await this.payments.findOne(id);
      if (!p) return res.status(404).json({ message: 'Partial payment not found' });
      return res.json(p);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('deals:edit')
  async create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const result = await this.payments.create(body, user.id);
      if ((result as any).notFound) return res.status(404).json({ message: 'Deal not found' });
      if ((result as any).overPayment) return res.status(400).json({ message: 'Payment exceeds total invoice amount' });
      return res.status(201).json(result);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('deals:edit')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Res() res: Response) {
    try {
      const result = await this.payments.update(id, body);
      if (!result) return res.status(404).json({ message: 'Partial payment not found' });
      return res.json(result);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('deals:edit')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const ok = await this.payments.remove(id, user.id);
      if (!ok) return res.status(404).json({ message: 'Partial payment not found' });
      return res.json({ message: 'Partial payment deleted successfully' });
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
