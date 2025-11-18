import { IsIn, IsNumber, IsString, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CalculateCalorieGoalDto {
  @ApiProperty({ description: "Giới tính", enum: ["male", "female"], example: "male" })
  @IsString()
  @IsIn(["male", "female"])
  gender!: "male" | "female";

  @ApiProperty({ description: "Tuổi", example: 25, minimum: 1, maximum: 120 })
  @IsNumber()
  @Min(1)
  @Max(120)
  age!: number;

  @ApiProperty({ description: "Chiều cao (cm)", example: 170, minimum: 50, maximum: 250 })
  @IsNumber()
  @Min(50)
  @Max(250)
  height!: number;

  @ApiProperty({ description: "Cân nặng (kg)", example: 70, minimum: 20, maximum: 300 })
  @IsNumber()
  @Min(20)
  @Max(300)
  weight!: number;

  @ApiProperty({ description: "Mức độ hoạt động", enum: ["low", "medium", "high"], example: "medium" })
  @IsString()
  @IsIn(["low", "medium", "high"])
  activity!: "low" | "medium" | "high";

  @ApiProperty({ description: "Mục tiêu", enum: ["lose_weight", "maintain", "gain_muscle"], example: "maintain" })
  @IsString()
  @IsIn(["lose_weight", "maintain", "gain_muscle"])
  goal!: "lose_weight" | "maintain" | "gain_muscle";
}

