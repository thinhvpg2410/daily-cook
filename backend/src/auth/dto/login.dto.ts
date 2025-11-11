import { IsNotEmpty } from "class-validator";

export class LoginDto {
  // Có thể là email hoặc số điện thoại
  // Email format: có @ và domain
  // Phone format: chỉ số, có thể có + ở đầu, có thể có spaces, dashes, parentheses
  @IsNotEmpty({ message: "Vui lòng nhập email hoặc số điện thoại" })
  username: string; // Email hoặc phone number

  @IsNotEmpty({ message: "Vui lòng nhập mật khẩu" })
  password: string;
  
  // nếu user bật 2FA, client gửi thêm mã
  twofaCode?: string;
}
