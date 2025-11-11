import { ArrayNotEmpty, IsArray, IsOptional, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeDto {
  @ApiProperty({ description: 'Tên công thức', example: 'Phở Bò' })
  @IsString() title: string;
  
  @ApiProperty({ description: 'Mô tả công thức', example: 'Món phở truyền thống Việt Nam', required: false })
  @IsOptional() @IsString() description?: string;

  @ApiProperty({ description: 'Các bước nấu', example: ['Bước 1: Chuẩn bị nguyên liệu', 'Bước 2: Nấu nước dùng'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  steps: string[];

  //  [{ingredientId, amount, unitOverride}]
  @ApiProperty({ 
    description: 'Danh sách nguyên liệu', 
    example: [
      { ingredientId: 'ing-1', amount: 500, unitOverride: 'gram' },
      { ingredientId: 'ing-2', amount: 2, unitOverride: 'liters' }
    ],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        ingredientId: { type: 'string' },
        amount: { type: 'number' },
        unitOverride: { type: 'string', required: false }
      }
    }
  })
  @IsArray() items: {
    ingredientId: string;
    amount: number;
    unitOverride?: string;
  }[];

  // tags: ["eat-clean","ăn sáng"]
  @ApiProperty({ description: 'Tags phân loại', example: ['vietnam', 'breakfast', 'noodles'], type: [String] })
  @IsArray() tags: string[];
}
