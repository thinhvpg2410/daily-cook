import { ArrayNotEmpty, IsArray, IsOptional, IsString } from "class-validator";

export class CreateRecipeDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;

  @IsArray()
  @ArrayNotEmpty()
  steps: string[];

  //  [{ingredientId, amount, unitOverride}]
  @IsArray() items: {
    ingredientId: string;
    amount: number;
    unitOverride?: string;
  }[];

  // tags: ["eat-clean","ăn sáng"]
  @IsArray() tags: string[];
}
