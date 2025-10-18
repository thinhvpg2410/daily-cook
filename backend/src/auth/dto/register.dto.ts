import { IsEmail, IsNotEmpty, IsPhoneNumber, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @MinLength(6) password: string;
  @IsNotEmpty() name: string;
  @IsPhoneNumber("VN", { message: "Số điện thoại không hợp lệ (VN)" })
  phone: string;
}
