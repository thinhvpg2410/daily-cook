import { IsDateString, IsOptional } from "class-validator";

export class QueryMealPlanDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}
