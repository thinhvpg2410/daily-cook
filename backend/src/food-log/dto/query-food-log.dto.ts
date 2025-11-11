import { IsDateString, IsOptional } from "class-validator";

export class QueryFoodLogDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

