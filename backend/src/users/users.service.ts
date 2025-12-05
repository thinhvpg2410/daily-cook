import { BadRequestException, Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { ChangePasswordDto } from "./dto/change-password.dto";
import * as admin from "firebase-admin";
import { FirebaseAdmin } from "../auth/firebase-admin.provider";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(FirebaseAdmin) private firebaseAdmin: admin.app.App
  ) {}

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
    const preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    
    // Return default preferences if not found
    if (!preferences) {
      return {
        userId,
        dailyKcalTarget: 2000,
        gender: null,
        age: null,
        height: null,
        weight: null,
        activity: null,
        goal: null,
        dietType: null,
        dislikedIngredients: [],
        likedTags: [],
      };
    }
    
    return preferences;
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

  async uploadAvatar(userId: string, imageData: string): Promise<{ avatarUrl: string }> {
    try {
      // Validate imageData (base64 data URL hoặc URL)
      if (!imageData || typeof imageData !== 'string') {
        throw new BadRequestException("Dữ liệu ảnh không hợp lệ");
      }

      // Nếu là URL từ internet, giữ nguyên
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // Update avatarUrl trong database
        await this.prisma.user.update({
          where: { id: userId },
          data: { avatarUrl: imageData },
        });
        return { avatarUrl: imageData };
      }

      // Nếu là base64 data URL, upload lên Firebase Storage
      if (!imageData.startsWith('data:image/')) {
        throw new BadRequestException("Định dạng ảnh không hợp lệ. Vui lòng gửi base64 data URL hoặc URL.");
      }

      // Parse base64 data URL
      const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new BadRequestException("Định dạng base64 không hợp lệ");
      }

      const imageType = matches[1] || 'jpeg';
      const base64Data = matches[2];

      // Convert base64 sang Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Kiểm tra kích thước (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (buffer.length > maxSize) {
        throw new BadRequestException("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2MB.");
      }

      // Tạo reference trong Firebase Storage
      const storage = this.firebaseAdmin.storage();
      const bucket = storage.bucket();
      const timestamp = Date.now();
      const fileName = `avatars/${userId}/avatar_${timestamp}.${imageType}`;
      const file = bucket.file(fileName);

      // Upload buffer lên Firebase Storage
      await file.save(buffer, {
        metadata: {
          contentType: `image/${imageType}`,
          cacheControl: 'public, max-age=31536000',
        },
        public: true, // Make file publicly accessible
      });

      // Make file publicly readable
      await file.makePublic();

      // Lấy public URL
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Update avatarUrl trong database
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: downloadURL },
      });

      return { avatarUrl: downloadURL };
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || "Không thể upload ảnh. Vui lòng thử lại."
      );
    }
  }
}
