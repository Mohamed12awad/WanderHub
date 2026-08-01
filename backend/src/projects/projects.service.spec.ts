import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService — mutation scope', () => {
  it('returns not-found and performs no write for another user\'s project', async () => {
    const otherUserProject = {
      id: 'project-user-b',
      managerId: 'user-b',
      status: 'active',
      deletedAt: null,
    };
    const prisma: any = {
      project: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.managerId === 'user-a' ? null : otherUserProject,
        ),
        update: jest.fn(),
      },
    };
    const visibility: any = {
      ownershipWhere: jest.fn().mockResolvedValue({ managerId: 'user-a' }),
    };
    const service = new ProjectsService(
      prisma,
      { log: jest.fn() } as any,
      visibility,
      {} as any,
    );
    const user = {
      id: 'user-a',
      role: 'member',
      roleId: 'member-role',
      permissions: ['projects:edit:own'],
    };

    await expect(service.update('project-user-b', { name: 'tampered' } as any, user))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'projects', 'managerId');
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-user-b', deletedAt: null, managerId: 'user-a' },
    });
    expect(prisma.project.update).not.toHaveBeenCalled();
  });
});
