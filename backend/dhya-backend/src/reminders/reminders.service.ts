import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReminderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; today?: boolean; upcoming?: boolean }) {
    const where: any = {};

    if (query?.status === 'pending') {
      where.completed = false;
      where.dismissed = false;
    } else if (query?.status === 'completed') {
      where.completed = true;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (query?.today) {
      where.scheduledAt = {
        gte: todayStart,
        lte: todayEnd,
      };
    } else if (query?.upcoming) {
      where.scheduledAt = {
        gt: now,
      };
    }

    return this.prisma.reminder.findMany({
      where,
      include: {
        task: true,
        event: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  async findOne(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid reminder id is required');
    }

    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: {
        task: true,
        event: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    return reminder;
  }

  async create(dto: CreateReminderDto) {
    const trimmedTitle = dto.title?.trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Reminder title is required');
    }

    if (!dto.scheduledAt) {
      throw new BadRequestException('scheduledAt date/time is required');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Valid scheduledAt date is required');
    }

    let type: ReminderType = ReminderType.CUSTOM;
    if (dto.type && Object.values(ReminderType).includes(dto.type)) {
      type = dto.type;
    } else if (dto.taskId) {
      type = ReminderType.TASK;
    } else if (dto.eventId) {
      type = ReminderType.EVENT;
    }

    let taskId: number | null = null;
    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({ where: { id: Number(dto.taskId) } });
      if (task) taskId = task.id;
    }

    let eventId: number | null = null;
    if (dto.eventId) {
      const event = await this.prisma.event.findUnique({ where: { id: Number(dto.eventId) } });
      if (event) eventId = event.id;
    }

    return this.prisma.reminder.create({
      data: {
        title: trimmedTitle,
        scheduledAt: scheduledDate,
        type,
        taskId,
        eventId,
        recurrence: dto.recurrence?.trim() || null,
        completed: false,
        dismissed: false,
      },
      include: {
        task: true,
        event: true,
      },
    });
  }

  async update(id: number, dto: UpdateReminderDto) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid reminder id is required');
    }

    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('Reminder title cannot be empty');
      data.title = trimmed;
    }
    if (dto.scheduledAt !== undefined) {
      const scheduled = new Date(dto.scheduledAt);
      if (isNaN(scheduled.getTime())) throw new BadRequestException('Invalid scheduled date');
      data.scheduledAt = scheduled;
    }
    if (dto.completed !== undefined) {
      data.completed = Boolean(dto.completed);
    }
    if (dto.dismissed !== undefined) {
      data.dismissed = Boolean(dto.dismissed);
    }
    if (dto.recurrence !== undefined) {
      data.recurrence = dto.recurrence ? dto.recurrence.trim() : null;
    }

    return this.prisma.reminder.update({
      where: { id },
      data,
      include: {
        task: true,
        event: true,
      },
    });
  }

  async remove(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid reminder id is required');
    }

    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    return this.prisma.reminder.delete({
      where: { id },
    });
  }
}
