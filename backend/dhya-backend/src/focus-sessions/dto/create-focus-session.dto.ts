import { SessionStatus } from '@prisma/client';

export class CreateFocusSessionDto {
  taskId!: number;
  startTime?: string | Date;
  endTime?: string | Date;
  plannedMinutes!: number;
  actualMinutes!: number;
  status?: SessionStatus;
  remark?: string;
  completed?: boolean;
}
