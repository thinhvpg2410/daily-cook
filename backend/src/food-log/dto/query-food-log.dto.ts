import { IsDateString, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class QueryFoodLogDto {
  @ApiProperty({ description: 'Ngày bắt đầu (ISO 8601)', example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiProperty({ description: 'Ngày kết thúc (ISO 8601)', example: '2024-01-31', required: false })
  @IsOptional()
  @IsDateString()
  end?: string;
}

