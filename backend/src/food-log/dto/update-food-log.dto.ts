import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateFoodLogDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(["breakfast", "lunch", "dinner", "snack"])
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";

  @IsOptional()
  @IsString()
  recipeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

