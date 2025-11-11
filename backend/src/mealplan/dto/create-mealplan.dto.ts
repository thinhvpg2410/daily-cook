import { IsDateString, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateMealPlanDto {
  @ApiProperty({ description: 'Ngày (YYYY-MM-DD)', example: '2024-01-15' })
  @IsDateString() date: string; // YYYY-MM-DD
  
  // slots dạng: { breakfast: [recipeId], lunch: [recipeId], dinner: [recipeId] }
  @ApiProperty({ 
    description: 'Các slot bữa ăn', 
    example: { breakfast: ['recipe-id-1'], lunch: ['recipe-id-2'], dinner: ['recipe-id-3'] },
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } }
  })
  slots: Record<string, string[]>;
  
  @ApiProperty({ description: 'Ghi chú', example: 'Kế hoạch bữa ăn tuần này', required: false })
  @IsOptional() note?: string;
}
