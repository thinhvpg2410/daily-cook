import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateFoodLogDto {
  @ApiProperty({ description: 'Ngày (ISO 8601)', example: '2024-01-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Loại bữa ăn', enum: ['breakfast', 'lunch', 'dinner', 'snack'], example: 'breakfast' })
  @IsEnum(["breakfast", "lunch", "dinner", "snack"])
  mealType!: "breakfast" | "lunch" | "dinner" | "snack";

  @ApiProperty({ description: 'ID công thức (tùy chọn)', example: 'recipe-id-123', required: false })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiProperty({ description: 'Calo (kcal)', example: 500, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @ApiProperty({ description: 'Protein (gram)', example: 30, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiProperty({ description: 'Chất béo (gram)', example: 20, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiProperty({ description: 'Carbohydrate (gram)', example: 50, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiProperty({ description: 'Ghi chú', example: 'Bữa sáng ngon', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

