import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class SuggestMenuDto {
  @ApiProperty({ description: 'Ngày áp dụng (ISO 8601)', example: '2024-01-15' })
  @IsDateString()
  date!: string; // ngày áp dụng

  @ApiProperty({ description: 'Loại bữa ăn', enum: ['breakfast', 'lunch', 'dinner', 'all'], example: 'all' })
  @IsIn(["breakfast", "lunch", "dinner", "all"])
  slot!: "breakfast" | "lunch" | "dinner" | "all";

  // tuỳ chọn
  @ApiProperty({ description: 'Bao gồm món khai vị', example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeStarter?: boolean; // gỏi/khai vị (default: false)

  @ApiProperty({ description: 'Bao gồm món tráng miệng', example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeDessert?: boolean; // tráng miệng/đồ uống (default: false)

  @ApiProperty({ description: 'Gợi ý món chay', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  vegetarian?: boolean; // gợi ý chay

  @ApiProperty({ description: 'Ưu tiên vùng miền', enum: ['Northern', 'Central', 'Southern'], example: 'Northern', required: false })
  @IsOptional()
  @IsString()
  region?: "Northern" | "Central" | "Southern"; // ưu tiên vùng miền (phù hợp các tag seed bạn đã dùng)

  @ApiProperty({ description: 'Thời gian nấu tối đa (phút)', example: 60, required: false, minimum: 10, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(180)
  maxCookTime?: number; // giới hạn tổng cookTime ước lượng

  @ApiProperty({ description: 'Nguyên liệu loại trừ (phân tách bằng dấu phẩy)', example: 'peanuts,shrimp', required: false })
  @IsOptional()
  @IsString()
  excludeIngredientNames?: string; // ví dụ "đậu phộng,tôm" – phân tách dấu phẩy

  @ApiProperty({ description: 'Lưu vào mealplan', example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  persist?: boolean; // ghi vào mealplan (default true)
}
