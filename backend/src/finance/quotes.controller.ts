import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleGuard } from '../common/module.guard';
import { RequireModule } from '../common/require-module.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('finance/quotes')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleGuard)
@RequireModule('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @RequirePermission('quotes:view')
  findAll(@Query() query: Record<string, string>) {
    return this.quotes.getQuotes(query);
  }

  @Get(':id')
  @RequirePermission('quotes:view')
  findOne(@Param('id') id: string) {
    return this.quotes.getQuoteById(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('quotes:create')
  create(@Body() body: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.createQuote(body, user.id);
  }

  @Put(':id')
  @RequirePermission('quotes:edit')
  update(@Param('id') id: string, @Body() body: UpdateQuoteDto) {
    return this.quotes.updateQuote(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('quotes:delete')
  remove(@Param('id') id: string) {
    return this.quotes.deleteQuote(id);
  }

  @Patch(':id/approve')
  @RequirePermission('quotes:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.approveQuote(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @RequirePermission('quotes:approve')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: AuthUser) {
    if (!body.reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.quotes.rejectQuote(id, user.id, body.reason.trim(), user.role);
  }

  @Post(':id/convert')
  @HttpCode(201)
  @RequirePermission('quotes:create')
  convert(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.convertQuoteToInvoice(id, user.id);
  }

  @Post(':id/convert-to-sales-order')
  @HttpCode(201)
  @RequirePermission('quotes:create')
  convertToSalesOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.convertQuoteToSalesOrder(id, user.id);
  }
}
