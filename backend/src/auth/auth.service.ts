import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TotpService } from "./totp.service";
import { OAuth2Client } from "google-auth-library";

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
    private totp: TotpService,
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

  async login(email: string, password: string, code?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
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
    if (!this.googleClient)
      throw new BadRequestException("Google chưa cấu hình");
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.cfg.get("GOOGLE_CLIENT_ID"),
    });
    const payload = ticket.getPayload();
    if (!payload?.email)
      throw new UnauthorizedException("Không xác thực được tài khoản Google");

    const { email, sub: googleId, name, picture } = payload;
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
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }
    return this.sign(user);
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
}
