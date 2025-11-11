import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { Enable2FADto } from "./dto/enable-2fa.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { VerifyResetCodeDto } from "./dto/verify-reset-code.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Đăng ký tài khoản mới" })
  @ApiResponse({ status: 201, description: "Đăng ký thành công" })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  @ApiResponse({ status: 409, description: "Email hoặc số điện thoại đã tồn tại" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name, dto.phone);
  }

  @Post("login")
  @ApiOperation({ summary: "Đăng nhập bằng email/số điện thoại và mật khẩu" })
  @ApiResponse({ status: 200, description: "Đăng nhập thành công" })
  @ApiResponse({ status: 401, description: "Thông tin đăng nhập không đúng" })
  @ApiResponse({ status: 403, description: "Cần mã xác thực 2FA" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password, dto.twofaCode);
  }

  @Post("google")
  @ApiOperation({ summary: "Đăng nhập bằng Google" })
  @ApiResponse({ status: 200, description: "Đăng nhập thành công" })
  @ApiResponse({ status: 401, description: "Token Google không hợp lệ" })
  google(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thông tin người dùng hiện tại" })
  @ApiResponse({ status: 200, description: "Thông tin người dùng" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  me(@CurrentUser() user: any) {
    return this.auth.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/init")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Khởi tạo xác thực 2 yếu tố (2FA)" })
  @ApiResponse({ status: 200, description: "QR code và secret key để thiết lập 2FA" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  init2fa(@CurrentUser() user: any) {
    return this.auth.enable2FA(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/enable")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Kích hoạt xác thực 2 yếu tố (2FA)" })
  @ApiResponse({ status: 200, description: "Kích hoạt 2FA thành công" })
  @ApiResponse({ status: 400, description: "Mã xác thực không đúng" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  enable(@CurrentUser() user: any, @Body() dto: Enable2FADto) {
    return this.auth.confirmEnable2FA(user.userId, dto.code);
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Quên mật khẩu - Gửi mã xác thực qua email" })
  @ApiResponse({ status: 200, description: "Mã xác thực đã được gửi qua email" })
  @ApiResponse({ status: 404, description: "Email không tồn tại" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post("verify-reset-code")
  @ApiOperation({ summary: "Xác thực mã đặt lại mật khẩu" })
  @ApiResponse({ status: 200, description: "Mã xác thực hợp lệ" })
  @ApiResponse({ status: 400, description: "Mã xác thực không đúng hoặc đã hết hạn" })
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.auth.verifyResetCode(dto.email, dto.code);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Đặt lại mật khẩu mới" })
  @ApiResponse({ status: 200, description: "Đặt lại mật khẩu thành công" })
  @ApiResponse({ status: 400, description: "Mã xác thực không đúng hoặc đã hết hạn" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.newPassword);
  }
}
