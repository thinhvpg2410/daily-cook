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
        phone: true,
        dob: true,
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
        phone: true,
        dob: true,
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

  async getPreferences(userId: string) {
    return this.prisma.userPreference.findUnique({
      where: { userId },
    });
  }

  async updatePreferences(userId: string, dto: any) {
    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    const updateData: any = {};
    
    // Chỉ update các field được gửi lên (không phải undefined)
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.age !== undefined) updateData.age = dto.age;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.activity !== undefined) updateData.activity = dto.activity;
    if (dto.goal !== undefined) updateData.goal = dto.goal;
    if (dto.dailyKcalTarget !== undefined) updateData.dailyKcalTarget = dto.dailyKcalTarget;
    if (dto.dietType !== undefined) updateData.dietType = dto.dietType;
    if (dto.dislikedIngredients !== undefined) updateData.dislikedIngredients = dto.dislikedIngredients;
    if (dto.likedTags !== undefined) updateData.likedTags = dto.likedTags;

    if (existing) {
      return this.prisma.userPreference.update({
        where: { userId },
        data: updateData,
      });
    }

    // Tạo mới với dữ liệu mặc định nếu không có
    return this.prisma.userPreference.create({
      data: {
        userId,
        ...updateData,
        dislikedIngredients: updateData.dislikedIngredients ?? [],
        likedTags: updateData.likedTags ?? [],
      },
    });
  }
}
