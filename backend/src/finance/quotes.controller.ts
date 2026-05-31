import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('finance/quotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QuotesController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  @RequirePermission('finance:view')
  findAll(@Query() query: Record<string, string>) {
    return this.finance.getQuotes(query);
  }

  @Get(':id')
  @RequirePermission('finance:view')
  findOne(@Param('id') id: string) {
    return this.finance.getQuoteById(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('finance:create')
  create(@Body() body: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.finance.createQuote(body, user.id);
  }

  @Put(':id')
  @RequirePermission('finance:edit')
  update(@Param('id') id: string, @Body() body: UpdateQuoteDto) {
    return this.finance.updateQuote(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('finance:delete')
  remove(@Param('id') id: string) {
    return this.finance.deleteQuote(id);
  }

  @Patch(':id/approve')
  @RequirePermission('finance:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.finance.approveQuote(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @RequirePermission('finance:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.finance.rejectQuote(id, user.id, body.reason.trim(), user.role);
  }

  @Post(':id/convert')
  @HttpCode(201)
  @RequirePermission('finance:create')
  convert(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.finance.convertQuoteToInvoice(id, user.id);
  }
}
