import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({ description: 'Giới tính', enum: ['male', 'female'], example: 'male', required: false })
  @IsOptional()
  @IsString()
  @IsIn(["male", "female"])
  gender?: string;

  @ApiProperty({ description: 'Tuổi', example: 25, required: false, minimum: 1, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiProperty({ description: 'Chiều cao (cm)', example: 170, required: false, minimum: 50, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  height?: number; // cm

  @ApiProperty({ description: 'Cân nặng (kg)', example: 70, required: false, minimum: 10, maximum: 300 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  weight?: number; // kg

  @ApiProperty({ description: 'Mức độ hoạt động', enum: ['low', 'medium', 'high'], example: 'medium', required: false })
  @IsOptional()
  @IsString()
  @IsIn(["low", "medium", "high"])
  activity?: string;

  @ApiProperty({ description: 'Mục tiêu', enum: ['lose_weight', 'maintain', 'gain_muscle'], example: 'maintain', required: false })
  @IsOptional()
  @IsString()
  @IsIn(["lose_weight", "maintain", "gain_muscle"])
  goal?: string;

  @ApiProperty({ description: 'Mục tiêu calo hàng ngày', example: 2000, required: false, minimum: 500, maximum: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(5000)
  dailyKcalTarget?: number;

  @ApiProperty({ description: 'Chế độ ăn', enum: ['normal', 'vegan', 'vegetarian', 'low_carb'], example: 'normal', required: false })
  @IsOptional()
  @IsString()
  @IsIn(["normal", "vegan", "vegetarian", "low_carb"])
  dietType?: string;

  @ApiProperty({ description: 'Danh sách nguyên liệu không thích', example: ['peanuts', 'shrimp'], type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedIngredients?: string[];

  @ApiProperty({ description: 'Tags yêu thích', example: ['Northern', 'Central', 'Spicy'], type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  likedTags?: string[]; // e.g., ["Northern", "Central", "Southern", "Spicy"]
}

