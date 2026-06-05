import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DedupService } from './dedup.service';
import { MergeDto } from './dto/merge.dto';

// Per-entity permissions are enforced inside the service (dynamic by :entity).
@Controller('dedup')
@UseGuards(JwtAuthGuard)
export class DedupController {
  constructor(private readonly dedup: DedupService) {}

  @Get(':entity/duplicates')
  duplicates(@Param('entity') entity: string, @CurrentUser() user: AuthUser) {
    return this.dedup.findDuplicates(entity, user);
  }

  @Post(':entity/merge')
  @HttpCode(200)
  merge(@Param('entity') entity: string, @Body() body: MergeDto, @CurrentUser() user: AuthUser) {
    return this.dedup.merge(entity, body.surviveId, body.mergeIds, user);
  }
}
