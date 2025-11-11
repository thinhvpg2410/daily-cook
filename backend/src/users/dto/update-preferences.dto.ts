import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(["male", "female"])
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  height?: number; // cm

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  weight?: number; // kg

  @IsOptional()
  @IsString()
  @IsIn(["low", "medium", "high"])
  activity?: string;

  @IsOptional()
  @IsString()
  @IsIn(["lose_weight", "maintain", "gain_muscle"])
  goal?: string;

  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(5000)
  dailyKcalTarget?: number;

  @IsOptional()
  @IsString()
  @IsIn(["normal", "vegan", "vegetarian", "low_carb"])
  dietType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedIngredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  likedTags?: string[]; // e.g., ["Northern", "Central", "Southern", "Spicy"]
}

