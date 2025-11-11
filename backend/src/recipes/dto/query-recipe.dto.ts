import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from '@nestjs/swagger';

export class QueryRecipeDto {
  @ApiProperty({ description: 'Từ khóa tìm kiếm', example: 'phở', required: false })
  @IsOptional() @IsString() q?: string; // từ khóa
  
  @ApiProperty({ description: 'Lọc theo tag', example: 'vietnam', required: false })
  @IsOptional() @IsString() tag?: string; // lọc theo tag
  
  @ApiProperty({ description: 'Số trang', example: 1, required: false, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  
  @ApiProperty({ description: 'Số lượng kết quả mỗi trang', example: 10, required: false, default: 10 })
  @IsOptional() @Type(() => Number) @IsInt() limit?: number = 10;
}
