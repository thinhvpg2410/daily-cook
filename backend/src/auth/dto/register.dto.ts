import { IsEmail, IsNotEmpty, IsPhoneNumber, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email người dùng', example: 'user@example.com' })
  @IsEmail() email: string;
  
  @ApiProperty({ description: 'Mật khẩu (tối thiểu 6 ký tự)', example: 'password123', minLength: 6 })
  @MinLength(6) password: string;
  
  @ApiProperty({ description: 'Tên người dùng', example: 'Nguyễn Văn A' })
  @IsNotEmpty() name: string;
  
  @ApiProperty({ description: 'Số điện thoại (định dạng Việt Nam)', example: '+84901234567' })
  @IsPhoneNumber("VN", { message: "Số điện thoại không hợp lệ (VN)" })
  phone: string;
}
