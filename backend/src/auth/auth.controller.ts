import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // FE gửi Firebase ID token (Bearer) để đổi lấy App JWT
  @Post('login')
  @UseGuards(FirebaseAuthGuard)
  async login(@Req() req: any) {
    const decoded = req.firebaseUser; // từ guard
    const profile = await this.auth.syncUserToFirestore(decoded);
    const accessToken = this.auth.issueAppJwt({ sub: decoded.uid });
    return { accessToken, user: profile };
  }

  @Get('me')
  async me() {
    return { ok: true }; // bạn có thể viết JwtGuard riêng cho các API còn lại
  }
}
