import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { BulkService } from './bulk.service';
import { BulkActionDto } from './dto/bulk-action.dto';

// Per-entity + per-action permissions are enforced inside the service.
@Controller('bulk')
@UseGuards(JwtAuthGuard)
export class BulkController {
  constructor(private readonly bulk: BulkService) {}

  @Post(':entity')
  @HttpCode(200)
  run(@Param('entity') entity: string, @Body() body: BulkActionDto, @CurrentUser() user: AuthUser) {
    return this.bulk.run(entity, body.action, body.ids, body.value, user);
  }
}
