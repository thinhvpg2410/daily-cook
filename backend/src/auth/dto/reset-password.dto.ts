import { IsString, IsEmail, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;

  @IsString()
  code!: string;
}

