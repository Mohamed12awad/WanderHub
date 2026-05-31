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
  findAll(@Query('linkedTo') linkedTo: string, @Query('linkedModel') linkedModel: string) {
    if (!linkedTo || !linkedModel) throw new BadRequestException('linkedTo and linkedModel are required');
    return this.notes.findAll(linkedTo, linkedModel);
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.notes.create(body, user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { content: string }, @CurrentUser() user: AuthUser) {
    const result = await this.notes.update(id, body.content, user.id, user.role, user.permissions);
    if (!result) throw new NotFoundException('Note not found');
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const ok = await this.notes.remove(id, user.id, user.role, user.permissions);
    if (!ok) throw new NotFoundException('Note not found');
    return;
  }
}
