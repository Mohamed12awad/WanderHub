import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';

@Controller('saved-views')
@UseGuards(JwtAuthGuard)
export class SavedViewsController {
  constructor(private readonly views: SavedViewsService) {}

  @Get()
  list(@Query('module') module: string, @CurrentUser() user: AuthUser) {
    return this.views.list(user, module);
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateSavedViewDto, @CurrentUser() user: AuthUser) {
    return this.views.create(user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.views.remove(user, id);
  }
}
