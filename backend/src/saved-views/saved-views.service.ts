import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, module?: string) {
    return this.prisma.savedView.findMany({
      where: { userId: user.id, ...(module ? { module } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(user: AuthUser, dto: CreateSavedViewDto) {
    return this.prisma.savedView.create({
      data: { userId: user.id, module: dto.module, name: dto.name, query: dto.query },
    });
  }

  async remove(user: AuthUser, id: string) {
    // Scoped to the owner — a user can only delete their own views.
    const view = await this.prisma.savedView.findFirst({ where: { id, userId: user.id } });
    if (!view) throw new NotFoundException('Saved view not found');
    await this.prisma.savedView.delete({ where: { id } });
    return true;
  }
}
