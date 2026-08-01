import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('notes:view')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  findAll(@Query('linkedTo') linkedTo: string, @Query('linkedModel') linkedModel: string, @CurrentUser() user: AuthUser) {
    if (!linkedTo || !linkedModel) throw new BadRequestException('linkedTo and linkedModel are required');
    return this.notes.findAll(linkedTo, linkedModel, user);
  }

  // Audit 2026-08 (P0): these routes inherited the class-level `notes:view`,
  // so a read-only role could write. Each mutation now requires its own
  // permission; the service already scopes update/remove by caller.
  @Post()
  @HttpCode(201)
  @RequirePermission('notes:create')
  create(@Body() body: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.notes.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission('notes:edit')
  async update(@Param('id') id: string, @Body() body: { content: string }, @CurrentUser() user: AuthUser) {
    const result = await this.notes.update(id, body.content, user);
    if (!result) throw new NotFoundException('Note not found');
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('notes:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const ok = await this.notes.remove(id, user);
    if (!ok) throw new NotFoundException('Note not found');
    return;
  }
}
