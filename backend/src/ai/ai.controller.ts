import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AiKeyService } from './ai-key.service';
import { AiTargetDto, SetAiConfigDto, SetAiKeyDto } from './dto/ai.dto';
import { AiProvider, isProvider } from './providers';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly keys: AiKeyService,
  ) {}

  private assertManage(user: AuthUser) {
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === 'settings:manage' || p.startsWith('settings:manage:'));
    if (!ok) throw new ForbiddenException('Permission denied: settings:manage');
  }

  private provider(p: string): AiProvider {
    if (!isProvider(p)) throw new BadRequestException(`Unknown provider: ${p}`);
    return p;
  }

  @Get('config')
  config(@CurrentUser() user: AuthUser) {
    return this.keys.getConfig(user.id);
  }

  @Put('config')
  setConfig(@Body() body: SetAiConfigDto, @CurrentUser() user: AuthUser) {
    this.assertManage(user);
    return this.keys.setConfig(body);
  }

  @Put('keys/:provider')
  setKey(@Param('provider') provider: string, @Body() body: SetAiKeyDto, @CurrentUser() user: AuthUser) {
    const scope = body.scope ?? 'workspace';
    if (scope === 'workspace') this.assertManage(user); // user-scoped keys are self-service
    return this.keys.setKey(this.provider(provider), body.key, scope, user.id);
  }

  @Delete('keys/:provider')
  @HttpCode(204)
  removeKey(
    @Param('provider') provider: string,
    @Query('scope') scope: 'workspace' | 'user' = 'workspace',
    @CurrentUser() user: AuthUser,
  ) {
    if (scope === 'workspace') this.assertManage(user);
    return this.keys.removeKey(this.provider(provider), scope, user.id);
  }

  @Post('summarize')
  @HttpCode(200)
  summarize(@Body() body: AiTargetDto, @CurrentUser() user: AuthUser) {
    return this.ai.summarize(body.entity, body.id, user);
  }

  @Post('score')
  @HttpCode(200)
  score(@Body() body: AiTargetDto, @CurrentUser() user: AuthUser) {
    return this.ai.score(body.entity, body.id, user);
  }
}
