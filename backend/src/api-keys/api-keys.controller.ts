import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @RequirePermission('settings:manage')
  list() {
    return this.apiKeys.list();
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('settings:manage')
  create(@Body() body: CreateApiKeyDto, @CurrentUser() user: AuthUser) {
    return this.apiKeys.create(body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('settings:manage')
  revoke(@Param('id') id: string) {
    return this.apiKeys.revoke(id);
  }
}
