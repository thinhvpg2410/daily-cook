import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TotpService } from "./totp.service";
import { OAuth2Client } from "google-auth-library";
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient?: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
    private totp: TotpService,
    private emailService: EmailService,
  ) {
    const cid = this.cfg.get<string>("GOOGLE_CLIENT_ID");
    if (cid) this.googleClient = new OAuth2Client(cid);
  }

  async register(email: string, password: string, name: string, phone: string) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (exists)
      throw new BadRequestException("Email hoặc số điện thoại đã tồn tại");

    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
      },
    });
    return this.sign(user);
  }

  async login(username: string, password: string, code?: string) {
    // username có thể là email hoặc phone
    // Kiểm tra xem là email (có @) hay phone
    const isEmail = username.includes("@");
    
    let user;
    if (isEmail) {
      // Tìm bằng email (trim và lowercase)
      user = await this.prisma.user.findUnique({ 
        where: { email: username.trim().toLowerCase() } 
      });
    } else {
      // Tìm bằng phone
      // Normalize phone: loại bỏ tất cả ký tự không phải số và dấu +
      let phone = username.trim();
      const hadPlusAtStart = phone.startsWith("+");
      
      // Loại bỏ tất cả ký tự đặc biệt (spaces, dashes, parentheses, etc.)
      // Chỉ giữ lại số và dấu +
      const cleaned = phone.replace(/[^\d\+]/g, "");
      
      // Xử lý dấu +: chỉ giữ một dấu + ở đầu
      let normalizedPhone: string;
      if (cleaned.includes("+")) {
        // Có dấu + trong cleaned string
        const digitsOnly = cleaned.replace(/\+/g, "");
        normalizedPhone = hadPlusAtStart ? "+" + digitsOnly : digitsOnly;
      } else {
        // Không có dấu + trong cleaned string
        normalizedPhone = hadPlusAtStart ? "+" + cleaned : cleaned;
      }
      
      // Thử tìm user với các format khác nhau của phone
      const phoneVariants: string[] = [];
      
      // Thêm normalized phone
      phoneVariants.push(normalizedPhone);
      
      // Nếu có dấu +, thêm variant không có dấu +
      if (normalizedPhone.startsWith("+")) {
        phoneVariants.push(normalizedPhone.substring(1));
      } else {
        // Nếu không có dấu +, thêm variant có dấu +
        phoneVariants.push("+" + normalizedPhone);
      }
      
      // Loại bỏ duplicates
      const uniqueVariants = Array.from(new Set(phoneVariants));
      
      // Tìm user với từng variant
      for (const variant of uniqueVariants) {
        user = await this.prisma.user.findUnique({ where: { phone: variant } });
        if (user) break;
      }
    }

    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Sai thông tin đăng nhập");
    
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("Sai thông tin đăng nhập");

    if (user.isTwoFAEnabled) {
      if (!code || !user.twoFASecret)
        throw new UnauthorizedException("Yêu cầu mã 2FA");
      this.totp.verify(code, user.twoFASecret);
    }
    return this.sign(user);
  }

  private async genUniquePlaceholderPhone(): Promise<string> {
    while (true) {
      const phone = `+999${Math.floor(1e8 + Math.random() * 9e8)}`; // +999 + 9 digits
      const exists = await this.prisma.user.findUnique({ where: { phone } });
      if (!exists) return phone;
    }
  }

  // Đăng nhập bằng Google ID Token (từ Google One Tap / Sign-In)
  async loginWithGoogle(idToken: string) {
    try {
      if (!this.googleClient) {
        console.error("Google client not initialized. Check GOOGLE_CLIENT_ID in .env");
        throw new BadRequestException("Google chưa cấu hình. Vui lòng kiểm tra GOOGLE_CLIENT_ID trong backend .env");
      }

      const googleClientId = this.cfg.get<string>("GOOGLE_CLIENT_ID");
      if (!googleClientId) {
        console.error("GOOGLE_CLIENT_ID not found in config");
        throw new BadRequestException("GOOGLE_CLIENT_ID chưa được cấu hình trong backend .env");
      }

      console.log("Verifying Google ID token with audience:", googleClientId);
      
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      
      const payload = ticket.getPayload();
      if (!payload?.email) {
        console.error("No email in Google token payload");
        throw new UnauthorizedException("Không xác thực được tài khoản Google");
      }

      const { email, sub: googleId, name, picture } = payload;
      console.log("Google login for email:", email);

      let user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        const phone = await this.genUniquePlaceholderPhone();
        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            name: name || "",
            avatarUrl: picture || "",
            phone,
          },
        });
        console.log("Created new user from Google login:", user.id);
      } else if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
        console.log("Linked Google account to existing user:", user.id);
      } else {
        console.log("Existing user logged in via Google:", user.id);
      }
      
      return this.sign(user);
    } catch (error: any) {
      console.error("Error in loginWithGoogle:", error);
      
      // Xử lý các lỗi cụ thể
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Lỗi từ Google Auth Library
      if (error.message?.includes("Invalid token") || error.message?.includes("Token used too early")) {
        throw new UnauthorizedException("Token Google không hợp lệ hoặc đã hết hạn");
      }
      
      if (error.message?.includes("Wrong number of segments")) {
        throw new BadRequestException("Format ID token không đúng");
      }
      
      // Lỗi database
      if (error.code === "P2002") {
        throw new BadRequestException("Email đã tồn tại trong hệ thống");
      }
      
      // Lỗi khác
      throw new BadRequestException(
        `Lỗi khi đăng nhập bằng Google: ${error.message || "Unknown error"}`
      );
    }
  }

  async enable2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User không tồn tại");
    const secret = this.totp.generateSecret(`DailyCook (${user.email})`);
    // Lưu secret ASCII (speakeasy mặc định)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFASecret: secret.ascii, isTwoFAEnabled: false },
    });
    // Trả về otpauth_url để quét QR bên client
    return { otpauthUrl: secret.otpauth_url, ascii: secret.ascii };
  }

  async confirmEnable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFASecret) throw new BadRequestException("Chưa khởi tạo 2FA");
    this.totp.verify(code, user.twoFASecret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFAEnabled: true },
    });
    return { enabled: true };
  }

  async getProfile(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        dob: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
    if (!u) throw new UnauthorizedException();
    return { ...u, userId: u.id };
  }

  private sign(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwt.sign(payload);
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        phone: user.phone ?? null,
        dob: user.dob ?? null,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        createdAt: user.createdAt ?? null,
      },
    };
  }

  // In-memory OTP storage (in production, use Redis or database with expiration)
  private otpStore = new Map<string, { code: string; expiresAt: number }>();

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: "Nếu email tồn tại, mã OTP đã được gửi" };
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP (keyed by email)
    this.otpStore.set(normalizedEmail, { code, expiresAt });

    try {
      // Send email with OTP via Mailjet
      await this.emailService.sendForgotPasswordEmail(
        normalizedEmail,
        code,
        user.name || undefined
      );
      this.logger.log(`Password reset email sent to ${normalizedEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${normalizedEmail}:`, error);
      
      // In development, still log the code for testing
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] OTP for ${normalizedEmail}: ${code}`);
        return {
          message: "Mã OTP đã được gửi đến email của bạn (hoặc xem console)",
          devCode: code,
        };
      }
      
      // In production, don't reveal the error details
      throw new BadRequestException(
        "Không thể gửi email. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
      );
    }

    return {
      message: "Mã OTP đã được gửi đến email của bạn",
    };
  }

  async verifyResetCode(email: string, code: string) {
    const stored = this.otpStore.get(email.toLowerCase());
    if (!stored) {
      throw new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn");
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(email.toLowerCase());
      throw new BadRequestException("Mã OTP đã hết hạn");
    }

    if (stored.code !== code) {
      throw new BadRequestException("Mã OTP không đúng");
    }

    // Code is valid, return success
    return { verified: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    // Verify code first
    await this.verifyResetCode(email, code);

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Remove OTP from store
    this.otpStore.delete(email.toLowerCase());

    return { message: "Mật khẩu đã được đặt lại thành công" };
  }
}
