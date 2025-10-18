import { IsDateString, IsOptional } from "class-validator";

export class CreateMealPlanDto {
  @IsDateString() date: string; // YYYY-MM-DD
  // slots dạng: { breakfast: [recipeId], lunch: [recipeId], dinner: [recipeId] }
  slots: Record<string, string[]>;
  @IsOptional() note?: string;
}
