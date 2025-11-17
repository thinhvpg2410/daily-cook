import { IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu cũ', example: 'oldpassword123' })
  @IsNotEmpty() oldPassword: string;
  
  @ApiProperty({ description: 'Mật khẩu mới (tối thiểu 6 ký tự)', example: 'newpassword123', minLength: 6 })
  @MinLength(6) newPassword: string;
}
