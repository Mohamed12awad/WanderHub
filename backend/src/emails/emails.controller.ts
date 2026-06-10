import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { EmailsService } from './emails.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(private readonly emails: EmailsService) {}

  @Post()
  @HttpCode(201)
  send(@Body() body: SendEmailDto, @CurrentUser() user: AuthUser) {
    return this.emails.send(body, user);
  }

  @Get()
  list(
    @Query('linkedToId') linkedToId: string,
    @Query('linkedModel') linkedModel: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.emails.list(linkedToId, linkedModel, user);
  }
}
