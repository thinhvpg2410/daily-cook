import { IsNotEmpty } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  // Có thể là email hoặc số điện thoại
  // Email format: có @ và domain
  // Phone format: chỉ số, có thể có + ở đầu, có thể có spaces, dashes, parentheses
  @ApiProperty({ description: 'Email hoặc số điện thoại', example: 'user@example.com' })
  @IsNotEmpty({ message: "Vui lòng nhập email hoặc số điện thoại" })
  username: string; // Email hoặc phone number

  @ApiProperty({ description: 'Mật khẩu', example: 'password123' })
  @IsNotEmpty({ message: "Vui lòng nhập mật khẩu" })
  password: string;
  
  // nếu user bật 2FA, client gửi thêm mã
  @ApiProperty({ description: 'Mã xác thực 2FA (nếu có)', example: '123456', required: false })
  twofaCode?: string;
}
