import { Priority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  title!: string;
  description?: string;
  estimatedMinutes?: number;
  priority?: Priority;
  status?: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  recurrence?: string;
  categoryId?: number;
  subtasks?: string[];
}

export class UpdateTaskDto {
  title?: string;
  description?: string;
  estimatedMinutes?: number;
  priority?: Priority;
  status?: TaskStatus;
  completed?: boolean;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrence?: string | null;
  categoryId?: number | null;
}

export class RescheduleTaskDto {
  dueDate!: string;
  dueTime?: string;
}

export class CreateSubtaskDto {
  title!: string;
}

export class UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
}
