import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  findAll() {
    return this.accounts.findAll();
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('settings:manage')
  create(@Body() body: CreateAccountDto) {
    return this.accounts.create(body);
  }

  @Patch(':id')
  @RequirePermission('settings:manage')
  update(@Param('id') id: string, @Body() body: UpdateAccountDto) {
    return this.accounts.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('settings:manage')
  remove(@Param('id') id: string) {
    return this.accounts.remove(id);
  }

  @Get(':id/statement')
  @RequirePermission('settings:view')
  statement(@Param('id') id: string, @Query() query: Record<string, string>) {
    return this.accounts.getStatement(id, query);
  }
}
