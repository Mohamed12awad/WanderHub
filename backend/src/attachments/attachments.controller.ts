import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

// Authenticated users can manage attachments; authorization to the underlying
// entity is enforced by that entity's own endpoints.
@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Query('linkedModel') linkedModel: string,
    @Query('linkedToId') linkedToId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.upload(file, linkedModel, linkedToId, user.id);
  }

  @Get()
  list(@Query('linkedModel') linkedModel: string, @Query('linkedToId') linkedToId: string) {
    return this.attachments.list(linkedModel, linkedToId);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { record, buffer } = await this.attachments.download(id);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.filename)}"`);
    res.send(buffer);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attachments.remove(id);
  }
}
