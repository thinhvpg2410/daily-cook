import { IsNotEmpty } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID Token từ Google Sign-In', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiJ9...' })
  @IsNotEmpty() idToken: string; // ID Token từ Google Sign-In
}
