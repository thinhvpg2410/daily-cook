import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() password: string;
  // nếu user bật 2FA, client gửi thêm mã
  twofaCode?: string;
}
