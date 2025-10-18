import { IsDateString } from "class-validator";

export class CopyWeekDto {
  @IsDateString()
  from!: string; //

  @IsDateString()
  to!: string; //
}
