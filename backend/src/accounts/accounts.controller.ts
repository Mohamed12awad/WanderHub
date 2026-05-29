import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @RequirePermission('settings:view')
  async findAll(@Res() res: Response) {
    try { return res.json(await this.accounts.findAll()); }
    catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }

  @Post()
  @RequirePermission('settings:manage')
  async create(@Body() body: CreateAccountDto, @Res() res: Response) {
    try { return res.json(await this.accounts.create(body)); }
    catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }

  @Patch(':id')
  @RequirePermission('settings:manage')
  async update(@Param('id') id: string, @Body() body: UpdateAccountDto, @Res() res: Response) {
    try {
      const result = await this.accounts.update(id, body);
      if (!result) return res.status(404).json({ message: 'Not found' });
      return res.json(result);
    } catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }

  @Delete(':id')
  @RequirePermission('settings:manage')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.accounts.remove(id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }

  @Get(':id/statement')
  @RequirePermission('settings:view')
  async statement(@Param('id') id: string, @Query() query: Record<string, string>, @Res() res: Response) {
    try { return res.json(await this.accounts.getStatement(id, query)); }
    catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }
}
