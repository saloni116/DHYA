import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { categoryId?: number; search?: string }) {
    const where: any = {};

    if (query?.categoryId) {
      where.categoryId = Number(query.categoryId);
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }

    return this.prisma.note.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid note id is required');
    }

    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }

  async create(dto: CreateNoteDto) {
    const trimmedTitle = dto.title?.trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Note title is required');
    }

    const content = dto.content !== undefined ? dto.content : '';

    let categoryId: number | null = null;
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: Number(dto.categoryId) },
      });
      if (cat) categoryId = cat.id;
    }

    return this.prisma.note.create({
      data: {
        title: trimmedTitle,
        content,
        categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: number, dto: UpdateNoteDto) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid note id is required');
    }

    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('Note title cannot be empty');
      data.title = trimmed;
    }
    if (dto.content !== undefined) {
      data.content = dto.content;
    }
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId ? Number(dto.categoryId) : null;
    }

    return this.prisma.note.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async remove(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid note id is required');
    }

    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return this.prisma.note.delete({
      where: { id },
    });
  }
}
