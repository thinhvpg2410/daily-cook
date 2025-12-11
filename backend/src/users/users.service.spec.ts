import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import * as argon2 from "argon2";
import * as admin from "firebase-admin";
import { FirebaseAdmin } from "../auth/firebase-admin.provider";

jest.mock("argon2");

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;
  let firebaseAdmin: admin.app.App;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPreference: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockFirebaseAdmin = {
    storage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FirebaseAdmin, useValue: mockFirebaseAdmin },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    firebaseAdmin = module.get<admin.app.App>(FirebaseAdmin);

    jest.clearAllMocks();
  });

  describe("getById", () => {
    it("should return user by id", async () => {
      const id = "user-123";
      const mockUser = {
        id,
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        role: "USER",
        phone: "+84123456789",
        dob: null,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getById(id);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const id = "user-123";
      const dto = {
        name: "Updated Name",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const updatedUser = {
        id,
        email: "test@example.com",
        ...dto,
        role: "USER",
        phone: "+84123456789",
        dob: null,
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(id, dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
        select: expect.any(Object),
      });
      expect(result.name).toBe(dto.name);
      expect(result.avatarUrl).toBe(dto.avatarUrl);
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const id = "user-123";
      const dto: ChangePasswordDto = {
        oldPassword: "old_password",
        newPassword: "new_password",
      };

      const mockUser = {
        id,
        passwordHash: "old_hashed_password",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue("new_hashed_password");
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: "new_hashed_password",
      });

      const result = await service.changePassword(id, dto);

      expect(argon2.verify).toHaveBeenCalledWith(
        "old_hashed_password",
        dto.oldPassword
      );
      expect(argon2.hash).toHaveBeenCalledWith(dto.newPassword);
      expect(result).toEqual({ changed: true });
    });

    it("should throw BadRequestException if old password is wrong", async () => {
      const id = "user-123";
      const dto: ChangePasswordDto = {
        oldPassword: "wrong_password",
        newPassword: "new_password",
      };

      const mockUser = {
        id,
        passwordHash: "old_hashed_password",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(id, dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException if user has no password (Google login)", async () => {
      const id = "user-123";
      const dto: ChangePasswordDto = {
        oldPassword: "old_password",
        newPassword: "new_password",
      };

      const mockUser = {
        id,
        passwordHash: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.changePassword(id, dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getPreferences", () => {
    it("should return user preferences", async () => {
      const userId = "user-123";
      const mockPreferences = {
        userId,
        dailyKcalTarget: 2000,
        gender: "male",
        age: 30,
        height: 175,
        weight: 70,
        activity: "medium",
        goal: "maintain",
        dietType: "normal",
        dislikedIngredients: [],
        likedTags: [],
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(userId);

      expect(result).toEqual(mockPreferences);
    });

    it("should return default preferences if not found", async () => {
      const userId = "user-123";

      mockPrisma.userPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreferences(userId);

      expect(result).toHaveProperty("userId", userId);
      expect(result).toHaveProperty("dailyKcalTarget", 2000);
      expect(result.dietType).toBeNull();
    });
  });

  describe("updatePreferences", () => {
    it("should update existing preferences", async () => {
      const userId = "user-123";
      const dto = {
        dailyKcalTarget: 2200,
        dietType: "vegan",
      };

      const existingPreferences = {
        userId,
        dailyKcalTarget: 2000,
        dietType: "normal",
      };

      const updatedPreferences = {
        ...existingPreferences,
        ...dto,
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(
        existingPreferences
      );
      mockPrisma.userPreference.update.mockResolvedValue(updatedPreferences);

      const result = await service.updatePreferences(userId, dto);

      expect(mockPrisma.userPreference.update).toHaveBeenCalled();
      expect(result.dailyKcalTarget).toBe(dto.dailyKcalTarget);
      expect(result.dietType).toBe(dto.dietType);
    });

    it("should create preferences if not exist", async () => {
      const userId = "user-123";
      const dto = {
        dailyKcalTarget: 2200,
        dietType: "vegan",
      };

      const newPreferences = {
        userId,
        ...dto,
        dislikedIngredients: [],
        likedTags: [],
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      mockPrisma.userPreference.create.mockResolvedValue(newPreferences);

      const result = await service.updatePreferences(userId, dto);

      expect(mockPrisma.userPreference.create).toHaveBeenCalled();
      expect(result).toEqual(newPreferences);
    });

    it("should only update provided fields", async () => {
      const userId = "user-123";
      const dto = {
        dailyKcalTarget: 2200,
      };

      const existingPreferences = {
        userId,
        dailyKcalTarget: 2000,
        dietType: "normal",
        gender: "male",
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(
        existingPreferences
      );
      mockPrisma.userPreference.update.mockResolvedValue({
        ...existingPreferences,
        dailyKcalTarget: 2200,
      });

      const result = await service.updatePreferences(userId, dto);

      expect(result.dailyKcalTarget).toBe(2200);
      expect(result.dietType).toBe("normal"); // Should remain unchanged
    });
  });

  describe("uploadAvatar", () => {
    it("should accept URL and update avatar", async () => {
      const userId = "user-123";
      const imageUrl = "https://example.com/avatar.jpg";

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        avatarUrl: imageUrl,
      });

      const result = await service.uploadAvatar(userId, imageUrl);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarUrl: imageUrl },
      });
      expect(result).toEqual({ avatarUrl: imageUrl });
    });

    it("should throw BadRequestException for invalid image data", async () => {
      const userId = "user-123";
      const invalidData = "";

      await expect(
        service.uploadAvatar(userId, invalidData)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid base64 format", async () => {
      const userId = "user-123";
      const invalidBase64 = "invalid_base64_string";

      await expect(
        service.uploadAvatar(userId, invalidBase64)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
