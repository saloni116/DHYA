import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { start?: string; end?: string; categoryId?: number; date?: string }) {
    const where: any = {};

    if (query?.categoryId) {
      where.categoryId = Number(query.categoryId);
    }

    if (query?.date) {
      const d = new Date(query.date);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      where.startDateTime = {
        gte: dayStart,
        lte: dayEnd,
      };
    } else if (query?.start && query?.end) {
      where.startDateTime = {
        gte: new Date(query.start),
        lte: new Date(query.end),
      };
    }

    return this.prisma.event.findMany({
      where,
      include: {
        category: true,
        reminders: true,
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });
  }

  async findOne(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid event id is required');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        reminders: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async create(dto: CreateEventDto) {
    const trimmedTitle = dto.title?.trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Event title is required');
    }

    if (!dto.startDateTime || !dto.endDateTime) {
      throw new BadRequestException('Start and end date/time are required');
    }

    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Valid start and end dates are required');
    }

    if (end < start) {
      throw new BadRequestException('End time cannot be before start time');
    }

    let categoryId: number | null = null;
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: Number(dto.categoryId) },
      });
      if (cat) categoryId = cat.id;
    }

    return this.prisma.event.create({
      data: {
        title: trimmedTitle,
        description: dto.description?.trim() || null,
        startDateTime: start,
        endDateTime: end,
        categoryId,
        recurrence: dto.recurrence?.trim() || null,
      },
      include: {
        category: true,
        reminders: true,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid event id is required');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('Event title cannot be empty');
      data.title = trimmed;
    }
    if (dto.description !== undefined) {
      data.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.startDateTime !== undefined) {
      const start = new Date(dto.startDateTime);
      if (isNaN(start.getTime())) throw new BadRequestException('Invalid start date');
      data.startDateTime = start;
    }
    if (dto.endDateTime !== undefined) {
      const end = new Date(dto.endDateTime);
      if (isNaN(end.getTime())) throw new BadRequestException('Invalid end date');
      data.endDateTime = end;
    }
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId ? Number(dto.categoryId) : null;
    }
    if (dto.recurrence !== undefined) {
      data.recurrence = dto.recurrence ? dto.recurrence.trim() : null;
    }

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        category: true,
        reminders: true,
      },
    });
  }

  async remove(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid event id is required');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.prisma.event.delete({
      where: { id },
    });
  }
}
