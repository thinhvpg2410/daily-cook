import { IsDateString, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Tên người dùng', example: 'Nguyễn Văn A', required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'URL avatar', example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ description: 'Ngày sinh (ISO 8601)', example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ description: 'Số điện thoại (định dạng Việt Nam)', example: '+84901234567', required: false })
  @IsOptional()
  @IsPhoneNumber("VN")
  phone?: string;
}
