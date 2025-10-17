import { IsNotEmpty } from "class-validator";

export class Enable2FADto {
  @IsNotEmpty() code: string; // mã xác thực từ app Authenticator
}
