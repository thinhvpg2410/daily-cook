import { IsString, IsEmail, Length } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({ description: 'Email người dùng', example: 'user@example.com' })
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Mã xác thực (6 chữ số)', example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code!: string;
}

