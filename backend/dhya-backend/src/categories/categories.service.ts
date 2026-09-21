import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const DEFAULT_CATEGORIES = [
  { name: 'Work', icon: 'work_outline', color: '#D4AF37', isDefault: true },
  { name: 'Personal', icon: 'person_outline', color: '#98A886', isDefault: true },
  { name: 'Shopping', icon: 'shopping_bag_outlined', color: '#E07A70', isDefault: true },
  { name: 'Finance', icon: 'account_balance_wallet_outlined', color: '#34D399', isDefault: true },
  { name: 'Family', icon: 'people_outline', color: '#E8DECA', isDefault: true },
  { name: 'Health', icon: 'favorite_border', color: '#60A5FA', isDefault: true },
  { name: 'Study', icon: 'menu_book_outlined', color: '#A78BFA', isDefault: true },
  { name: 'Other', icon: 'bookmark_border', color: '#A1A1AA', isDefault: true },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async seedDefaults() {
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await this.prisma.category.findUnique({
        where: { name: cat.name },
      });
      if (!existing) {
        await this.prisma.category.create({
          data: cat,
        });
      }
    }
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
            events: true,
            notes: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        tasks: true,
        events: true,
        notes: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const trimmed = dto.name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this.prisma.category.findUnique({
      where: { name: trimmed },
    });
    if (existing) {
      throw new BadRequestException(`Category "${trimmed}" already exists`);
    }

    return this.prisma.category.create({
      data: {
        name: trimmed,
        icon: dto.icon || 'bookmark_border',
        color: dto.color || '#D4AF37',
        isDefault: false,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('Category name cannot be empty');
      data.name = trimmed;
    }
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
