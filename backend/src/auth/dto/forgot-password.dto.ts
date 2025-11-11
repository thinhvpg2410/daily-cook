import { IsString, IsEmail } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email người dùng', example: 'user@example.com' })
  @IsString()
  @IsEmail()
  email!: string;
}

