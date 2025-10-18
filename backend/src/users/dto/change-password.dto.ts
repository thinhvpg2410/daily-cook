import { IsNotEmpty, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsNotEmpty() oldPassword: string;
  @MinLength(6) newPassword: string;
}
