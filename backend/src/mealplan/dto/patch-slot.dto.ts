import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class PatchSlotDto {
  @IsIn(["breakfast", "lunch", "dinner"])
  slot!: "breakfast" | "lunch" | "dinner";

  @IsOptional()
  @IsArray()
  set?: string[]; // recipeIds

  @IsOptional()
  @IsString()
  add?: string; // recipeId

  @IsOptional()
  @IsString()
  remove?: string; // recipeId
}
