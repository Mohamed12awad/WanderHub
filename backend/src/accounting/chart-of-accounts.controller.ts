import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MoneyAsString } from '../common/money-as-string.decorator';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto/chart-of-account.dto';

@Controller('accounting/chart-of-accounts')
@UseGuards(JwtAuthGuard, PermissionGuard)
@MoneyAsString()
export class ChartOfAccountsController {
  constructor(private readonly coa: ChartOfAccountsService) {}

  @Get()
  @RequirePermission('accounting:view')
  findAll(@Query() query: Record<string, string>) {
    return this.coa.findAll(query);
  }

  @Get(':id/ledger')
  @RequirePermission('accounting:view')
  ledger(@Param('id') id: string, @Query() query: Record<string, string>) {
    return this.coa.ledger(id, query);
  }

  @Get(':id')
  @RequirePermission('accounting:view')
  findOne(@Param('id') id: string) {
    return this.coa.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('accounting:manage')
  create(@Body() body: CreateChartOfAccountDto) {
    return this.coa.create(body);
  }

  @Patch(':id')
  @RequirePermission('accounting:manage')
  update(@Param('id') id: string, @Body() body: UpdateChartOfAccountDto) {
    return this.coa.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('accounting:manage')
  remove(@Param('id') id: string) {
    return this.coa.remove(id);
  }
}
