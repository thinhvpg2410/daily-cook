import { IsNotEmpty, MinLength, Matches } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu cũ', example: 'OldPassword123!' })
  @IsNotEmpty() oldPassword: string;
  
  @ApiProperty({ 
    description: 'Mật khẩu mới (tối thiểu 8 ký tự, 1 chữ hoa, 1 số, 1 ký tự đặc biệt)', 
    example: 'NewPassword123!',
    minLength: 8 
  })
  @MinLength(8, { message: 'Mật khẩu phải có tối thiểu 8 ký tự' })
  @Matches(/[A-Z]/, { message: 'Mật khẩu phải có ít nhất 1 chữ cái viết hoa' })
  @Matches(/[0-9]/, { message: 'Mật khẩu phải có ít nhất 1 số' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt' })
  newPassword: string;
}
