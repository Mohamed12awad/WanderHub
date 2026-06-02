import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { StorageService } from './storage.service';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    linkedModel: string,
    linkedToId: string,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!linkedModel || !linkedToId) throw new BadRequestException('linkedModel and linkedToId are required');
    if (file.size > MAX_BYTES) throw new BadRequestException('File exceeds the 10 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);

    const storageKey = await this.storage.save(file.buffer, file.originalname);
    const record = await this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        size: file.size,
        linkedModel,
        linkedToId,
        uploadedById: userId,
      },
    });
    return toClient(record);
  }

  async list(linkedModel: string, linkedToId: string) {
    return toClient(
      await this.prisma.attachment.findMany({
        where: { linkedModel, linkedToId },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /** Returns the stored file plus metadata for streaming back to the client. */
  async download(id: string) {
    const record = await this.prisma.attachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attachment not found');
    const buffer = await this.storage.read(record.storageKey);
    return { record, buffer };
  }

  async remove(id: string) {
    const record = await this.prisma.attachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attachment not found');
    await this.storage.delete(record.storageKey);
    await this.prisma.attachment.delete({ where: { id } });
    return true;
  }

  /** Convenience used by other modules (e.g. async invoice PDFs). */
  async count(linkedModel: string, linkedToId: string): Promise<number> {
    return this.prisma.attachment.count({ where: { linkedModel, linkedToId } });
  }
}
