import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

  updateProfile(id: string, dto: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.passwordHash)
      throw new BadRequestException(
        "Tài khoản chưa đặt mật khẩu (đăng nhập Google)",
      );
    const ok = await argon2.verify(user.passwordHash, dto.oldPassword);
    if (!ok) throw new BadRequestException("Mật khẩu cũ không đúng");
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { changed: true };
  }
}
