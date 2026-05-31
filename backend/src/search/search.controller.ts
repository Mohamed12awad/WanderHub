import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q: string, @CurrentUser() user: AuthUser) {
    return this.searchService.search(q ?? '', user);
  }
}
