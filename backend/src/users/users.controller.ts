import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: any) {
    return this.users.getById(user.userId);
  }

  @Patch("me")
  update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Patch("me/password")
  changePass(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.userId, dto);
  }
}
