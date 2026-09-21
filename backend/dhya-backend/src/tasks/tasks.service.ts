import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSubtaskDto,
  CreateTaskDto,
  RescheduleTaskDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
} from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Helper to compute next recurrence date
  private calculateNextRecurrence(currentDate: Date, recurrence: string): Date {
    const next = new Date(currentDate);
    const rule = recurrence.toUpperCase().trim();

    if (rule === 'DAILY') {
      next.setDate(next.getDate() + 1);
    } else if (rule === 'WEEKLY') {
      next.setDate(next.getDate() + 7);
    } else if (rule === 'MONTHLY') {
      next.setMonth(next.getMonth() + 1);
    } else if (rule.startsWith('CUSTOM:')) {
      // e.g. CUSTOM:MON,WED,FRI
      const daysStr = rule.replace('CUSTOM:', '');
      const dayMap: Record<string, number> = {
        SUN: 0,
        MON: 1,
        TUE: 2,
        WED: 3,
        THU: 4,
        FRI: 5,
        SAT: 6,
      };
      const targetDays = daysStr
        .split(',')
        .map((d) => dayMap[d.trim()])
        .filter((d) => d !== undefined)
        .sort((a, b) => a - b);

      if (targetDays.length > 0) {
        let currentDay = next.getDay();
        let daysToAdd = 1;
        while (true) {
          const checkDay = (currentDay + daysToAdd) % 7;
          if (targetDays.includes(checkDay)) {
            next.setDate(next.getDate() + daysToAdd);
            break;
          }
          daysToAdd++;
          if (daysToAdd > 7) {
            next.setDate(next.getDate() + 7);
            break;
          }
        }
      } else {
        next.setDate(next.getDate() + 1);
      }
    } else {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  // GET /tasks
  async findAll(query?: {
    status?: TaskStatus;
    priority?: Priority;
    categoryId?: number;
    search?: string;
    overdue?: boolean;
    today?: boolean;
    upcoming?: boolean;
  }) {
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }
    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.categoryId) {
      where.categoryId = Number(query.categoryId);
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (query?.overdue) {
      where.completed = false;
      where.dueDate = {
        lt: todayStart,
      };
    } else if (query?.today) {
      where.dueDate = {
        gte: todayStart,
        lte: todayEnd,
      };
    } else if (query?.upcoming) {
      where.dueDate = {
        gt: todayEnd,
      };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        category: true,
        subtasks: {
          orderBy: { id: 'asc' },
        },
        focusSessions: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: true,
      },
    });

    // Priority sorting: HIGH (3) -> MEDIUM (2) -> LOW (1)
    const priorityWeight: Record<Priority, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return tasks.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (pDiff !== 0) return pDiff;

      // Then due date ascending if present
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      return a.id - b.id;
    });
  }

  // GET /tasks/today
  async getTodayTasks() {
    return this.findAll({ today: true });
  }

  // GET /tasks/upcoming
  async getUpcomingTasks() {
    return this.findAll({ upcoming: true });
  }

  // GET /tasks/overdue
  async getOverdueTasks() {
    return this.findAll({ overdue: true });
  }

  // GET /tasks/:id
  async findOne(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid task id is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        category: true,
        subtasks: {
          orderBy: { id: 'asc' },
        },
        focusSessions: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  // POST /tasks
  async create(dto: CreateTaskDto) {
    const trimmedTitle = dto.title ? dto.title.trim() : '';
    if (!trimmedTitle) {
      throw new BadRequestException('Task title cannot be empty');
    }

    const duration = Number(dto.estimatedMinutes) || 0;
    if (duration < 0) {
      throw new BadRequestException('Estimated duration must be 0 or positive');
    }

    const priority =
      dto.priority && Object.values(Priority).includes(dto.priority)
        ? dto.priority
        : Priority.MEDIUM;

    const status =
      dto.status && Object.values(TaskStatus).includes(dto.status)
        ? dto.status
        : TaskStatus.TODO;

    const completed = status === TaskStatus.COMPLETED;

    let categoryId: number | null = null;
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: Number(dto.categoryId) },
      });
      if (cat) {
        categoryId = cat.id;
      }
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const dueTime = dto.dueTime?.trim() || null;
    const recurrence = dto.recurrence?.trim() || null;
    const description = dto.description?.trim() || null;

    const subtaskCreates =
      dto.subtasks && Array.isArray(dto.subtasks)
        ? dto.subtasks
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((title) => ({ title, completed: false }))
        : [];

    return this.prisma.task.create({
      data: {
        title: trimmedTitle,
        description,
        estimatedMinutes: duration,
        priority,
        status,
        completed,
        dueDate,
        dueTime,
        recurrence,
        categoryId,
        subtasks: {
          create: subtaskCreates,
        },
      },
      include: {
        category: true,
        subtasks: {
          orderBy: { id: 'asc' },
        },
        focusSessions: true,
        reminders: true,
      },
    });
  }

  // PATCH /tasks/:id
  async update(id: number, dto: UpdateTaskDto) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid task id is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { subtasks: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const data: any = {};

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) {
        throw new BadRequestException('Task title cannot be empty');
      }
      data.title = trimmed;
    }

    if (dto.description !== undefined) {
      data.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.estimatedMinutes !== undefined) {
      const duration = Number(dto.estimatedMinutes);
      if (isNaN(duration) || duration < 0) {
        throw new BadRequestException('Estimated duration must be 0 or positive');
      }
      data.estimatedMinutes = duration;
    }

    if (dto.priority !== undefined) {
      if (!Object.values(Priority).includes(dto.priority)) {
        throw new BadRequestException('Invalid task priority');
      }
      data.priority = dto.priority;
    }

    let isBecomingCompleted = false;
    if (dto.status !== undefined) {
      if (!Object.values(TaskStatus).includes(dto.status)) {
        throw new BadRequestException('Invalid task status');
      }
      data.status = dto.status;
      data.completed = dto.status === TaskStatus.COMPLETED;
      if (!task.completed && data.completed) {
        isBecomingCompleted = true;
      }
    } else if (dto.completed !== undefined) {
      data.completed = Boolean(dto.completed);
      data.status = data.completed ? TaskStatus.COMPLETED : TaskStatus.TODO;
      if (!task.completed && data.completed) {
        isBecomingCompleted = true;
      }
    }

    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.dueTime !== undefined) {
      data.dueTime = dto.dueTime ? dto.dueTime.trim() : null;
    }

    if (dto.recurrence !== undefined) {
      data.recurrence = dto.recurrence ? dto.recurrence.trim() : null;
    }

    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId ? Number(dto.categoryId) : null;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        category: true,
        subtasks: {
          orderBy: { id: 'asc' },
        },
        focusSessions: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: true,
      },
    });

    // Handle Recurring Task when completed: generate next occurrence cleanly
    if (isBecomingCompleted && task.recurrence) {
      const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const nextDate = this.calculateNextRecurrence(baseDate, task.recurrence);

      // Create next scheduled task occurrence cleanly
      await this.prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          estimatedMinutes: task.estimatedMinutes,
          priority: task.priority,
          status: TaskStatus.TODO,
          completed: false,
          dueDate: nextDate,
          dueTime: task.dueTime,
          recurrence: task.recurrence,
          categoryId: task.categoryId,
          subtasks: {
            create: task.subtasks.map((st) => ({
              title: st.title,
              completed: false,
            })),
          },
        },
      });
    }

    return updatedTask;
  }

  // PATCH /tasks/:id/reschedule
  async reschedule(id: number, dto: RescheduleTaskDto) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid task id is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (!dto.dueDate) {
      throw new BadRequestException('New dueDate is required for rescheduling');
    }

    const data: any = {
      dueDate: new Date(dto.dueDate),
    };
    if (dto.dueTime !== undefined) {
      data.dueTime = dto.dueTime ? dto.dueTime.trim() : null;
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        category: true,
        subtasks: {
          orderBy: { id: 'asc' },
        },
        focusSessions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Subtask: POST /tasks/:id/subtasks
  async addSubtask(taskId: number, dto: CreateSubtaskDto) {
    if (!taskId || isNaN(taskId)) {
      throw new BadRequestException('Valid task id is required');
    }
    const trimmed = dto.title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Subtask title cannot be empty');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return this.prisma.subtask.create({
      data: {
        taskId,
        title: trimmed,
        completed: false,
      },
    });
  }

  // Subtask: PATCH /tasks/:id/subtasks/:subtaskId
  async updateSubtask(taskId: number, subtaskId: number, dto: UpdateSubtaskDto) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!subtask) {
      throw new NotFoundException(`Subtask with ID ${subtaskId} not found for this task`);
    }

    const data: any = {};
    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('Subtask title cannot be empty');
      data.title = trimmed;
    }
    if (dto.completed !== undefined) {
      data.completed = Boolean(dto.completed);
    }

    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });
  }

  // Subtask: DELETE /tasks/:id/subtasks/:subtaskId
  async removeSubtask(taskId: number, subtaskId: number) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!subtask) {
      throw new NotFoundException(`Subtask with ID ${subtaskId} not found for this task`);
    }

    return this.prisma.subtask.delete({
      where: { id: subtaskId },
    });
  }

  // DELETE /tasks/:id
  async remove(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid task id is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }
}
