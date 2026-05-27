import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  async findAll(@Query('linkedTo') linkedTo: string, @Query('linkedModel') linkedModel: string, @Res() res: Response) {
    if (!linkedTo || !linkedModel) return res.status(400).json({ message: 'linkedTo and linkedModel are required' });
    try { return res.json(await this.notes.findAll(linkedTo, linkedModel)); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  async create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try { return res.status(201).json(await this.notes.create(body, user.id)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { content: string }, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const result = await this.notes.update(id, body.content, user.id, user.role, user.permissions);
      if (!result) return res.status(404).json({ message: 'Note not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'You can only edit your own notes' });
      return res.json(result);
    } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    try {
      const result = await this.notes.remove(id, user.id, user.role, user.permissions);
      if (!result) return res.status(404).json({ message: 'Note not found' });
      if ((result as any).forbidden) return res.status(403).json({ message: 'You can only delete your own notes' });
      return res.json({ message: 'Note deleted' });
    } catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }
}
