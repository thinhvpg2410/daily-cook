import { IsOptional, IsString, IsObject } from "class-validator";

export class UpdateMealPlanDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObject()
  slots?: Record<string, string[]>;
}
