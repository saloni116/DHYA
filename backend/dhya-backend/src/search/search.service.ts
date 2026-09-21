import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchAll(query: string) {
    const q = query?.trim();
    if (!q) {
      return { tasks: [], events: [], notes: [] };
    }

    const [tasks, events, notes] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
          subtasks: true,
        },
        take: 20,
      }),
      this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
        },
        take: 20,
      }),
      this.prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
        },
        take: 20,
      }),
    ]);

    return {
      tasks,
      events,
      notes,
    };
  }
}
