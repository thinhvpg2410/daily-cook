import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { TotpService } from "./totp.service";
import { EmailService } from "../email/email.service";
import * as argon2 from "argon2";

jest.mock("argon2");

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let totpService: TotpService;
  let emailService: EmailService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockTotpService = {
    generateSecret: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendForgotPasswordEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TotpService, useValue: mockTotpService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    totpService = module.get<TotpService>(TotpService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const email = "test@example.com";
      const password = "password123";
      const name = "Test User";
      const phone = "+84123456789";

      mockPrisma.user.findFirst.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue("hashed_password");
      mockPrisma.user.create.mockResolvedValue({
        id: "user-123",
        email,
        name,
        phone,
        passwordHash: "hashed_password",
        role: "USER",
      });
      mockJwtService.sign.mockReturnValue("jwt_token");

      const result = await service.register(email, password, name, phone);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email }, { phone }] },
      });
      expect(argon2.hash).toHaveBeenCalledWith(password);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty("accessToken", "jwt_token");
      expect(result).toHaveProperty("user");
    });

    it("should throw BadRequestException if email already exists", async () => {
      const email = "existing@example.com";
      const password = "password123";
      const name = "Test User";
      const phone = "+84123456789";

      mockPrisma.user.findFirst.mockResolvedValue({
        id: "existing-user",
        email,
      });

      await expect(
        service.register(email, password, name, phone)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if phone already exists", async () => {
      const email = "new@example.com";
      const password = "password123";
      const name = "Test User";
      const phone = "+84123456789";

      mockPrisma.user.findFirst.mockResolvedValue({
        id: "existing-user",
        phone,
      });

      await expect(
        service.register(email, password, name, phone)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("login", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      passwordHash: "hashed_password",
      role: "USER",
      isTwoFAEnabled: false,
    };

    it("should login successfully with email", async () => {
      const username = "test@example.com";
      const password = "password123";

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("jwt_token");

      const result = await service.login(username, password);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: username.trim().toLowerCase() },
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        "hashed_password",
        password
      );
      expect(result).toHaveProperty("accessToken");
    });

    it("should login successfully with phone", async () => {
      const username = "+84123456789";
      const password = "password123";

      const phoneUser = {
        ...mockUser,
        phone: "+84123456789",
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // First call returns null (for +84123456789)
        .mockResolvedValueOnce(phoneUser); // Second call returns user (for 84123456789)

      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("jwt_token");

      const result = await service.login(username, password);

      expect(result).toHaveProperty("accessToken");
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      const username = "test@example.com";
      const password = "wrong_password";

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should require 2FA code when enabled", async () => {
      const username = "test@example.com";
      const password = "password123";
      const userWith2FA = {
        ...mockUser,
        isTwoFAEnabled: true,
        twoFASecret: "secret",
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWith2FA);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException
      );

      // Should succeed with valid 2FA code
      mockTotpService.verify.mockReturnValue(true);
      mockJwtService.sign.mockReturnValue("jwt_token");

      const result = await service.login(username, password, "123456");
      expect(result).toHaveProperty("accessToken");
    });
  });

  describe("loginWithGoogle", () => {
    it("should throw BadRequestException if Google client is not configured", async () => {
      const idToken = "google_id_token";
      mockConfigService.get.mockReturnValue(undefined);

      // Create a new instance without Google client
      const serviceWithoutGoogle = new AuthService(
        prisma,
        jwtService,
        mockConfigService as any,
        totpService,
        emailService
      );

      await expect(
        serviceWithoutGoogle.loginWithGoogle(idToken)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("enable2FA", () => {
    it("should generate 2FA secret for user", async () => {
      const userId = "user-123";
      const mockUser = {
        id: userId,
        email: "test@example.com",
      };
      const mockSecret = {
        ascii: "secret_ascii",
        otpauth_url: "otpauth://totp/...",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockTotpService.generateSecret.mockReturnValue(mockSecret);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        twoFASecret: mockSecret.ascii,
      });

      const result = await service.enable2FA(userId);

      expect(mockTotpService.generateSecret).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty("otpauthUrl", mockSecret.otpauth_url);
    });

    it("should throw BadRequestException if user not found", async () => {
      const userId = "non-existent";

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.enable2FA(userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("confirmEnable2FA", () => {
    it("should confirm and enable 2FA", async () => {
      const userId = "user-123";
      const code = "123456";
      const mockUser = {
        id: userId,
        twoFASecret: "secret",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockTotpService.verify.mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        isTwoFAEnabled: true,
      });

      const result = await service.confirmEnable2FA(userId, code);

      expect(mockTotpService.verify).toHaveBeenCalledWith(code, "secret");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isTwoFAEnabled: true },
      });
      expect(result).toEqual({ enabled: true });
    });

    it("should throw BadRequestException if 2FA not initialized", async () => {
      const userId = "user-123";
      const code = "123456";

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFASecret: null,
      });

      await expect(service.confirmEnable2FA(userId, code)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("forgotPassword", () => {
    it("should send OTP email successfully", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "user-123",
        email,
        name: "Test User",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockEmailService.sendForgotPasswordEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(email);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.trim().toLowerCase() },
      });
      expect(mockEmailService.sendForgotPasswordEmail).toHaveBeenCalled();
      expect(result).toHaveProperty("message");
    });

    it("should not reveal if user exists (security)", async () => {
      const email = "nonexistent@example.com";

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result).toHaveProperty("message");
      expect(mockEmailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe("verifyResetCode", () => {
    it("should verify valid OTP code", async () => {
      const email = "test@example.com";
      const code = "123456";

      // Manually set OTP in the store (since it's private)
      const expiresAt = Date.now() + 10 * 60 * 1000;
      (service as any).otpStore.set(email.toLowerCase(), {
        code,
        expiresAt,
      });

      const result = await service.verifyResetCode(email, code);

      expect(result).toEqual({ verified: true });
    });

    it("should throw BadRequestException for invalid code", async () => {
      const email = "test@example.com";
      const code = "123456";
      const wrongCode = "999999";

      const expiresAt = Date.now() + 10 * 60 * 1000;
      (service as any).otpStore.set(email.toLowerCase(), {
        code,
        expiresAt,
      });

      await expect(
        service.verifyResetCode(email, wrongCode)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for expired code", async () => {
      const email = "test@example.com";
      const code = "123456";

      const expiresAt = Date.now() - 1000; // Expired
      (service as any).otpStore.set(email.toLowerCase(), {
        code,
        expiresAt,
      });

      await expect(service.verifyResetCode(email, code)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const email = "test@example.com";
      const code = "123456";
      const newPassword = "new_password123";

      const mockUser = {
        id: "user-123",
        email,
      };

      // Set valid OTP
      const expiresAt = Date.now() + 10 * 60 * 1000;
      (service as any).otpStore.set(email.toLowerCase(), {
        code,
        expiresAt,
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.hash as jest.Mock).mockResolvedValue("new_hashed_password");
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: "new_hashed_password",
      });

      const result = await service.resetPassword(email, code, newPassword);

      expect(argon2.hash).toHaveBeenCalledWith(newPassword);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty("message");
    });

    it("should throw BadRequestException if code is invalid", async () => {
      const email = "test@example.com";
      const code = "wrong_code";
      const newPassword = "new_password123";

      await expect(
        service.resetPassword(email, code, newPassword)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const userId = "user-123";
      const mockProfile = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
        phone: "+84123456789",
        role: "USER",
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile(userId);

      expect(result).toHaveProperty("userId", userId);
      expect(result).toHaveProperty("email");
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const userId = "non-existent";

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
