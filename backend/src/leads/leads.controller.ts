import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermission('leads:view')
  async findAll(@Query() query: Record<string, string>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.json(await this.leads.findAll(query, user)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Get(':id')
  @RequirePermission('leads:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const lead = await this.leads.findOne(id, user);
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      return res.json(lead);
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('leads:create')
  async create(@Body() body: CreateLeadDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.leads.create(body, user.id)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  @RequirePermission('leads:edit')
  async update(@Param('id') id: string, @Body() body: UpdateLeadDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const lead = await this.leads.update(id, body, user.id);
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      return res.json(lead);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('leads:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.leads.remove(id);
      if (!ok) return res.status(404).json({ message: 'Lead not found' });
      return res.json({ message: 'Lead deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post(':id/convert')
  @RequirePermission('leads:edit')
  async convert(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const customer = await this.leads.convertToCustomer(id, user.id);
      if (!customer) return res.status(404).json({ message: 'Lead not found' });
      return res.status(201).json(customer);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
