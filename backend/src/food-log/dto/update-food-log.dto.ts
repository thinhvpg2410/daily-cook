import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFoodLogDto {
  @ApiProperty({ description: 'Ngày (ISO 8601)', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Loại bữa ăn', enum: ['breakfast', 'lunch', 'dinner', 'snack'], example: 'lunch', required: false })
  @IsOptional()
  @IsEnum(["breakfast", "lunch", "dinner", "snack"])
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";

  @ApiProperty({ description: 'ID công thức', example: 'recipe-id-123', required: false })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiProperty({ description: 'Calo (kcal)', example: 600, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @ApiProperty({ description: 'Protein (gram)', example: 40, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiProperty({ description: 'Chất béo (gram)', example: 25, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiProperty({ description: 'Carbohydrate (gram)', example: 60, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiProperty({ description: 'Ghi chú', example: 'Bữa trưa đầy đủ', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

