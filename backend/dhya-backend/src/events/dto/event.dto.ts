export class CreateEventDto {
  title!: string;
  description?: string;
  startDateTime!: string;
  endDateTime!: string;
  categoryId?: number;
  recurrence?: string;
}

export class UpdateEventDto {
  title?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  categoryId?: number | null;
  recurrence?: string | null;
}
