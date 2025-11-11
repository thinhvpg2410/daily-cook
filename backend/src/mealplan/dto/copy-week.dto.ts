import { IsDateString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CopyWeekDto {
  @ApiProperty({ description: 'Ngày bắt đầu tuần nguồn (ISO 8601)', example: '2024-01-01' })
  @IsDateString()
  from!: string; //

  @ApiProperty({ description: 'Ngày bắt đầu tuần đích (ISO 8601)', example: '2024-01-08' })
  @IsDateString()
  to!: string; //
}
