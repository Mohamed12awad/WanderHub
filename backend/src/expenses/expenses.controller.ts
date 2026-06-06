import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  @RequirePermission('expenses:view')
  findAll(@Query() query: Record<string, string>) {
    return this.expenses.findAll(query);
  }

  @Get(':id')
  @RequirePermission('expenses:view')
  findOne(@Param('id') id: string) {
    return this.expenses.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('expenses:create')
  create(@Body() body: CreateExpenseReportDto, @CurrentUser() user: AuthUser) {
    return this.expenses.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('expenses:edit')
  update(@Param('id') id: string, @Body() body: UpdateExpenseReportDto) {
    return this.expenses.update(id, body);
  }

  @Patch(':id/approve')
  @RequirePermission('expenses:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.expenses.approve(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @RequirePermission('expenses:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.expenses.reject(id, user.id, body.reason.trim(), user.role);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('expenses:delete')
  remove(@Param('id') id: string) {
    return this.expenses.remove(id);
  }
}
