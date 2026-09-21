export class CreateNoteDto {
  title!: string;
  content!: string;
  categoryId?: number;
}

export class UpdateNoteDto {
  title?: string;
  content?: string;
  categoryId?: number | null;
}
