import { IsNotEmpty } from "class-validator";

export class GoogleLoginDto {
  @IsNotEmpty() idToken: string; // ID Token từ Google Sign-In
}
