import { IsNotEmpty } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ description: 'Mã xác thực từ ứng dụng Authenticator', example: '123456' })
  @IsNotEmpty() code: string; // mã xác thực từ app Authenticator
}
