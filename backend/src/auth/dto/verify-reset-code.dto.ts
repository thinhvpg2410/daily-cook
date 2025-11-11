import { IsString, IsEmail, Length } from "class-validator";

export class VerifyResetCodeDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

