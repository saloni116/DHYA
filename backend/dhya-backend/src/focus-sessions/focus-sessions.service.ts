import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFocusSessionDto } from './dto/create-focus-session.dto';

@Injectable()
export class FocusSessionsService {
  constructor(private prisma: PrismaService) {}

  // POST /focus-sessions
  async create(data: CreateFocusSessionDto) {
    const taskId = Number(data.taskId);
    if (!taskId || isNaN(taskId)) {
      throw new BadRequestException('Valid taskId is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const plannedMinutes = Number(data.plannedMinutes) || 0;
    const actualMinutes = Number(data.actualMinutes) || 0;
    const completed = Boolean(data.completed);
    const remark = data.remark?.trim() || null;
    const startTime = data.startTime ? new Date(data.startTime) : new Date();
    const endTime = data.endTime ? new Date(data.endTime) : new Date();

    const status = data.status && Object.values(SessionStatus).includes(data.status)
      ? data.status
      : (completed ? SessionStatus.COMPLETED : SessionStatus.ABANDONED);

    return this.prisma.focusSession.create({
      data: {
        taskId,
        startTime,
        endTime,
        plannedMinutes,
        actualMinutes,
        status,
        remark,
        completed,
      },
      include: {
        task: true,
      },
    });
  }

  // GET /focus-sessions
  async findAll(taskId?: number) {
    const where: any = {};
    if (taskId) {
      where.taskId = Number(taskId);
    }

    return this.prisma.focusSession.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        task: true,
      },
    });
  }

  // GET /focus-sessions/stats
  async getStats() {
    const [totalTasks, completedTasks, pendingTasks, allSessions] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { completed: true } }),
      this.prisma.task.count({ where: { completed: false } }),
      this.prisma.focusSession.findMany(),
    ]);

    const allTasks = await this.prisma.task.findMany();
    const totalPlannedMinutes = allTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const completedFocusMinutes = allSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
    const totalSessions = allSessions.length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      totalPlannedMinutes,
      completedFocusMinutes,
      totalSessions,
    };
  }

  // GET /focus-sessions/:id
  async findOne(id: number) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id },
      include: {
        task: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }

    return session;
  }
}
