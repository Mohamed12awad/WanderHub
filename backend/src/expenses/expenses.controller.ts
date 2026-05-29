import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  @RequirePermission('expenses:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.expenses.findAll(query)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('expenses:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const r = await this.expenses.findOne(id);
      if (!r) return res.status(404).json({ message: 'Expense report not found' });
      return res.json(r);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('expenses:create')
  async create(@Body() body: CreateExpenseReportDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.expenses.create(body, user.id)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('expenses:edit')
  async update(@Param('id') id: string, @Body() body: UpdateExpenseReportDto, @Res() res: Response) {
    try {
      const r = await this.expenses.update(id, body);
      if (!r) return res.status(404).json({ message: 'Expense report not found' });
      return res.json(r);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Patch(':id/approve')
  @RequirePermission('expenses:approve')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const r = await this.expenses.approve(id, user.id, user.role);
      if (!r) return res.status(404).json({ message: 'Expense report not found' });
      if ((r as any).forbidden) return res.status(403).json({ message: 'You are not authorized to approve expense reports' });
      return res.json(r);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Patch(':id/reject')
  @RequirePermission('expenses:approve')
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser, @Res() res: Response) {
    if (!body.reason?.trim()) return res.status(400).json({ message: 'Rejection reason is required' });
    try {
      const r = await this.expenses.reject(id, user.id, body.reason.trim(), user.role);
      if (!r) return res.status(404).json({ message: 'Expense report not found' });
      if ((r as any).forbidden) return res.status(403).json({ message: 'You are not authorized to reject expense reports' });
      return res.json(r);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('expenses:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.expenses.remove(id);
      if (!ok) return res.status(404).json({ message: 'Expense report not found' });
      return res.status(204).end();
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
