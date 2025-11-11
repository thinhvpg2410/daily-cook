import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class PatchSlotDto {
  @ApiProperty({ description: 'Loại bữa ăn', enum: ['breakfast', 'lunch', 'dinner'], example: 'breakfast' })
  @IsIn(["breakfast", "lunch", "dinner"])
  slot!: "breakfast" | "lunch" | "dinner";

  @ApiProperty({ description: 'Thiết lập danh sách công thức cho slot', example: ['recipe-id-1', 'recipe-id-2'], type: [String], required: false })
  @IsOptional()
  @IsArray()
  set?: string[]; // recipeIds

  @ApiProperty({ description: 'Thêm một công thức vào slot', example: 'recipe-id-3', required: false })
  @IsOptional()
  @IsString()
  add?: string; // recipeId

  @ApiProperty({ description: 'Xóa một công thức khỏi slot', example: 'recipe-id-1', required: false })
  @IsOptional()
  @IsString()
  remove?: string; // recipeId
}
