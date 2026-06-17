import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { MoneyAsString } from '../common/money-as-string.decorator';
import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/journal-entry.dto';

@Controller('accounting/journal')
@UseGuards(JwtAuthGuard, PermissionGuard)
@MoneyAsString()
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  @RequirePermission('accounting:view')
  list(@Query() query: Record<string, string>) {
    return this.journal.list(query);
  }

  @Get('for/:model/:id')
  @RequirePermission('accounting:view')
  documentEntries(@Param('model') model: string, @Param('id') id: string) {
    return this.journal.documentEntries(model, id);
  }

  @Get(':id')
  @RequirePermission('accounting:view')
  findOne(@Param('id') id: string) {
    return this.journal.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('accounting:manage')
  create(@Body() body: CreateJournalEntryDto, @CurrentUser() user: AuthUser) {
    return this.journal.createManual(body, user.id);
  }

  @Post(':id/reverse')
  @HttpCode(200)
  @RequirePermission('accounting:manage')
  reverse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.journal.reverse(id, user.id);
  }
}
