import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../customers/dto/update-customer.dto';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { UpdateLeadDto } from '../leads/dto/update-lead.dto';
import { CreateDealDto } from '../deals/dto/create-deal.dto';
import { UpdateDealDto } from '../deals/dto/update-deal.dto';

/**
 * Versioned public REST API authenticated by API key. Routes delegate to the
 * same domain services as the app, so validation, dedup, timeline logging and
 * visibility scoping all apply identically.
 */
@Controller('public/v1')
@UseGuards(ApiKeyGuard, PermissionGuard)
export class PublicApiController {
  constructor(
    private readonly customers: CustomersService,
    private readonly leads: LeadsService,
    private readonly deals: DealsService,
  ) {}

  // ── Customers ──────────────────────────────────────────────────────────────
  @Get('customers')
  @RequirePermission('contacts:view')
  listCustomers(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.customers.findAll(query, user);
  }

  @Get('customers/:id')
  @RequirePermission('contacts:view')
  getCustomer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.customers.findOne(id, user);
  }

  @Post('customers')
  @HttpCode(201)
  @RequirePermission('contacts:create')
  createCustomer(@Body() body: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customers.create(body, user.id);
  }

  @Put('customers/:id')
  @RequirePermission('contacts:edit')
  updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customers.update(id, body, user.id);
  }

  // ── Leads ──────────────────────────────────────────────────────────────────
  @Get('leads')
  @RequirePermission('leads:view')
  listLeads(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.leads.findAll(query, user);
  }

  @Get('leads/:id')
  @RequirePermission('leads:view')
  getLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leads.findOne(id, user);
  }

  @Post('leads')
  @HttpCode(201)
  @RequirePermission('leads:create')
  createLead(@Body() body: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leads.create(body, user.id);
  }

  @Put('leads/:id')
  @RequirePermission('leads:edit')
  updateLead(@Param('id') id: string, @Body() body: UpdateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leads.update(id, body, user.id);
  }

  // ── Deals ──────────────────────────────────────────────────────────────────
  @Get('deals')
  @RequirePermission('deals:view')
  listDeals(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.deals.findAll(query, user);
  }

  @Get('deals/:id')
  @RequirePermission('deals:view')
  getDeal(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.deals.findOne(id, false, user);
  }

  @Post('deals')
  @HttpCode(201)
  @RequirePermission('deals:create')
  createDeal(@Body() body: CreateDealDto, @CurrentUser() user: AuthUser) {
    return this.deals.create(body, user.id);
  }

  @Put('deals/:id')
  @RequirePermission('deals:edit')
  updateDeal(@Param('id') id: string, @Body() body: UpdateDealDto, @CurrentUser() user: AuthUser) {
    return this.deals.update(id, body, user.id);
  }
}
