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
import { AttachmentsService, MAX_BYTES, ALLOWED_MIME } from './attachments.service';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
  }))
  upload(
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Query('linkedModel') linkedModel: string,
    @Query('linkedToId') linkedToId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.upload(file, linkedModel, linkedToId, user);
  }

  @Get()
  list(
    @Query('linkedModel') linkedModel: string,
    @Query('linkedToId') linkedToId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.list(linkedModel, linkedToId, user);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response, @CurrentUser() user: AuthUser) {
    const { record, buffer } = await this.attachments.download(id, user);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.filename)}"`);
    res.send(buffer);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attachments.remove(id, user);
  }
}
