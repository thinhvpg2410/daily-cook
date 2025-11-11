import { IsOptional, IsString, IsObject } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMealPlanDto {
  @ApiProperty({ description: 'Ghi chú', example: 'Cập nhật kế hoạch bữa ăn', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ 
    description: 'Các slot bữa ăn', 
    example: { breakfast: ['recipe-id-1'], lunch: ['recipe-id-2'] },
    type: Object,
    required: false
  })
  @IsOptional()
  @IsObject()
  slots?: Record<string, string[]>;
}
