import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { EmailsService } from './emails.service';
import { SendEmailDto } from './dto/send-email.dto';

// Audit 2026-08 (P1): this controller carried JwtAuthGuard only, so ANY
// authenticated user could send arbitrary outbound mail through the company's
// SMTP configuration. Sending is now a distinct, grantable permission and is
// rate-limited well below the global ceiling.
@Controller('emails')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmailsController {
  constructor(private readonly emails: EmailsService) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('emails:send')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  send(@Body() body: SendEmailDto, @CurrentUser() user: AuthUser) {
    return this.emails.send(body, user);
  }

  @Get()
  @RequirePermission('emails:view')
  list(
    @Query('linkedToId') linkedToId: string,
    @Query('linkedModel') linkedModel: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.emails.list(linkedToId, linkedModel, user);
  }
}
