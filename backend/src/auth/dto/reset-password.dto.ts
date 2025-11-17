import { IsString, IsEmail, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email người dùng', example: 'user@example.com' })
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Mật khẩu mới (tối thiểu 6 ký tự)', example: 'newpassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @ApiProperty({ description: 'Mã xác thực', example: '123456' })
  @IsString()
  code!: string;
}

