import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@ApiTags("Users")
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thông tin profile của người dùng hiện tại" })
  @ApiResponse({ status: 200, description: "Thông tin profile" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  me(@CurrentUser() user: any) {
    return this.users.getById(user.userId);
  }

  @Patch("me")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Cập nhật thông tin profile" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Patch("me/password")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Đổi mật khẩu" })
  @ApiResponse({ status: 200, description: "Đổi mật khẩu thành công" })
  @ApiResponse({ status: 400, description: "Mật khẩu cũ không đúng" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  changePass(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.userId, dto);
  }

  @Get("me/preferences")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy tùy chọn của người dùng" })
  @ApiResponse({ status: 200, description: "Tùy chọn người dùng" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getPreferences(@CurrentUser() user: any) {
    return this.users.getPreferences(user.userId);
  }

  @Patch("me/preferences")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Cập nhật tùy chọn của người dùng" })
  @ApiResponse({ status: 200, description: "Cập nhật tùy chọn thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  updatePreferences(@CurrentUser() user: any, @Body() dto: UpdatePreferencesDto) {
    return this.users.updatePreferences(user.userId, dto);
  }
}
