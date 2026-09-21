export class CreateCategoryDto {
  name: string;
  icon?: string;
  color?: string;
}

export class UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
}
