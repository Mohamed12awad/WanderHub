import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ImportService } from './import.service';
import { ImportRequestDto } from './dto/import-request.dto';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importer: ImportService) {}

  // Field metadata is harmless to any authenticated user; the actual import
  // (POST) enforces the entity-specific create permission in the service.
  @Get(':entity/fields')
  fields(@Param('entity') entity: string) {
    return this.importer.getFields(entity);
  }

  @Post(':entity')
  @HttpCode(200)
  run(
    @Param('entity') entity: string,
    @Body() body: ImportRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importer.run(entity, body, user);
  }
}
