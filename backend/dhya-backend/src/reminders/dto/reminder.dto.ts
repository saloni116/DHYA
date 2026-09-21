import { ReminderType } from '@prisma/client';

export class CreateReminderDto {
  title!: string;
  scheduledAt!: string;
  type?: ReminderType;
  taskId?: number;
  eventId?: number;
  recurrence?: string;
}

export class UpdateReminderDto {
  title?: string;
  scheduledAt?: string;
  type?: ReminderType;
  completed?: boolean;
  dismissed?: boolean;
  recurrence?: string | null;
}
