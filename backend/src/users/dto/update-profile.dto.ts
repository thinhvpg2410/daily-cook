import { IsDateString, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsPhoneNumber("VN")
  phone?: string;
}
