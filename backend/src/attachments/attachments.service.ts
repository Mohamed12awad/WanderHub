import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { StorageService } from './storage.service';
import { LinkedAccessService } from '../common/linked-access.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME = new Set([
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
    private readonly linkedAccess: LinkedAccessService,
  ) {}

  async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    linkedModel: string,
    linkedToId: string,
    user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!linkedModel || !linkedToId) throw new BadRequestException('linkedModel and linkedToId are required');
    if (file.size > MAX_BYTES) throw new BadRequestException('File exceeds the 10 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    await this.linkedAccess.assertCanAccess(user, linkedModel, linkedToId);

    const storageKey = await this.storage.save(file.buffer, file.originalname);
    const record = await this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        size: file.size,
        linkedModel,
        linkedToId,
        uploadedById: user.id,
      },
    });
    return toClient(record);
  }

  async list(linkedModel: string, linkedToId: string, user: AuthUser) {
    await this.linkedAccess.assertCanAccess(user, linkedModel, linkedToId);
    return toClient(
      await this.prisma.attachment.findMany({
        where: { linkedModel, linkedToId },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async download(id: string, user: AuthUser) {
    const record = await this.prisma.attachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attachment not found');
    await this.linkedAccess.assertCanAccess(user, record.linkedModel, record.linkedToId);
    const buffer = await this.storage.read(record.storageKey);
    return { record, buffer };
  }

  async remove(id: string, user: AuthUser) {
    const record = await this.prisma.attachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attachment not found');
    await this.linkedAccess.assertCanAccess(user, record.linkedModel, record.linkedToId);
    await this.storage.delete(record.storageKey);
    await this.prisma.attachment.delete({ where: { id } });
    return true;
  }

  /** Convenience used by other modules (e.g. async invoice PDFs). */
  async count(linkedModel: string, linkedToId: string): Promise<number> {
    return this.prisma.attachment.count({ where: { linkedModel, linkedToId } });
  }
}
