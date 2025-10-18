import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SuggestMenuDto {
  @IsDateString()
  date!: string; // ngày áp dụng

  @IsIn(["breakfast", "lunch", "dinner", "all"])
  slot!: "breakfast" | "lunch" | "dinner" | "all";

  // tuỳ chọn
  @IsOptional()
  @IsBoolean()
  includeStarter?: boolean; // gỏi/khai vị (default: false)

  @IsOptional()
  @IsBoolean()
  includeDessert?: boolean; // tráng miệng/đồ uống (default: false)

  @IsOptional()
  @IsBoolean()
  vegetarian?: boolean; // gợi ý chay

  @IsOptional()
  @IsString()
  region?: "Northern" | "Central" | "Southern"; // ưu tiên vùng miền (phù hợp các tag seed bạn đã dùng)

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(180)
  maxCookTime?: number; // giới hạn tổng cookTime ước lượng

  @IsOptional()
  @IsString()
  excludeIngredientNames?: string; // ví dụ "đậu phộng,tôm" – phân tách dấu phẩy

  @IsOptional()
  @IsBoolean()
  persist?: boolean; // ghi vào mealplan (default true)
}
