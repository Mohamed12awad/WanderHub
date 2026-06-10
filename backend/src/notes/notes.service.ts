import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { LinkedAccessService } from '../common/linked-access.service';
import { toClient } from '../common/serialize';
import { CreateNoteDto } from './dto/create-note.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

const TIMELINE_MODELS = new Set(['Customer', 'Deal']);

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly linkedAccess: LinkedAccessService,
  ) {}

  async findAll(linkedTo: string, linkedModel: string, user: AuthUser) {
    await this.linkedAccess.assertCanAccess(user, linkedModel, linkedTo);
    const notes = await this.prisma.note.findMany({
      where: { linkedToId: linkedTo, linkedModel },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return toClient(notes);
  }

  async create(body: CreateNoteDto, userId: string) {
    const { _id, id, createdAt, updatedAt, createdBy, linkedTo, linkedToId: _ltId, ...rest } =
      body as unknown as Record<string, unknown>;
    const linkedId = (_ltId ?? linkedTo) as string;
    const data: Record<string, unknown> = { ...rest, linkedToId: linkedId, createdById: userId };
    if (rest.linkedModel === 'Customer') data.customerId = linkedId;
    if (rest.linkedModel === 'Deal') data.dealId = linkedId;
    if (rest.linkedModel === 'Product') data.productId = linkedId;
    if (rest.linkedModel === 'Expense') data.expenseReportId = linkedId;

    const note = await this.prisma.note.create({
      data: data as Prisma.NoteUncheckedCreateInput,
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (TIMELINE_MODELS.has(note.linkedModel)) {
      const preview = note.content.slice(0, 80) + (note.content.length > 80 ? '…' : '');
      await this.timeline.log(
        'note.added',
        `Note added: "${preview}"`,
        note.linkedToId,
        note.linkedModel as 'Customer' | 'Deal',
        { preview },
        userId,
      );
    }

    return toClient(note);
  }

  async update(id: string, content: string, user: AuthUser) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) return null;
    const canModify =
      user.id === note.createdById ||
      user.permissions.includes('*') ||
      user.permissions.includes('notes:edit');
    if (!canModify) throw new ForbiddenException('You can only edit your own notes');
    const updated = await this.prisma.note.update({
      where: { id },
      data: { content },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return toClient(updated);
  }

  async remove(id: string, user: AuthUser) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) return null;
    const canModify =
      user.id === note.createdById ||
      user.permissions.includes('*') ||
      user.permissions.includes('notes:edit');
    if (!canModify) throw new ForbiddenException('You can only delete your own notes');
    await this.prisma.note.delete({ where: { id } });
    return true;
  }
}
