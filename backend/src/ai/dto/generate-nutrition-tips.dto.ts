import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class DailyNutritionDto {
  @ApiProperty({ description: "Ngày (YYYY-MM-DD)" })
  @IsString()
  date!: string;

  @ApiProperty({ description: "Calories" })
  @IsNumber()
  calories!: number;

  @ApiProperty({ description: "Protein (gram)" })
  @IsNumber()
  protein!: number;

  @ApiProperty({ description: "Fat (gram)" })
  @IsNumber()
  fat!: number;

  @ApiProperty({ description: "Carbs (gram)" })
  @IsNumber()
  carbs!: number;

  @ApiProperty({ description: "Nguồn dữ liệu", required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

class AverageNutritionDto {
  @ApiProperty({ description: "Calories trung bình" })
  @IsNumber()
  calories!: number;

  @ApiProperty({ description: "Protein trung bình (gram)" })
  @IsNumber()
  protein!: number;

  @ApiProperty({ description: "Fat trung bình (gram)" })
  @IsNumber()
  fat!: number;

  @ApiProperty({ description: "Carbs trung bình (gram)" })
  @IsNumber()
  carbs!: number;
}

export class GenerateNutritionTipsDto {
  @ApiProperty({ description: "Dữ liệu dinh dưỡng từng ngày", type: [DailyNutritionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyNutritionDto)
  daily!: DailyNutritionDto[];

  @ApiProperty({ description: "Dữ liệu dinh dưỡng trung bình", type: AverageNutritionDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AverageNutritionDto)
  average!: AverageNutritionDto;

  @ApiProperty({ description: "Mục tiêu calories/ngày" })
  @IsNumber()
  calorieTarget!: number;

  @ApiProperty({ description: "Ngày bắt đầu tuần (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  weekStart?: string;

  @ApiProperty({ description: "Ngày kết thúc tuần (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  weekEnd?: string;
}

