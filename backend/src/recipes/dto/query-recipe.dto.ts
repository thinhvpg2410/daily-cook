import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class QueryRecipeDto {
  @IsOptional() @IsString() q?: string; // từ khóa
  @IsOptional() @IsString() tag?: string; // lọc theo tag
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() limit?: number = 10;
}
