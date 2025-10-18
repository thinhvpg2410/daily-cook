import { Injectable, BadRequestException } from "@nestjs/common";
import * as speakeasy from "speakeasy";

@Injectable()
export class TotpService {
  // Tạo secret cho 2FA
  generateSecret(label: string) {
    return speakeasy.generateSecret({ length: 20, name: label });
  }

  // Verify mã người dùng nhập
  verify(token: string, secret: string) {
    const ok = speakeasy.totp.verify({
      token,
      secret,
      encoding: "ascii",
      window: 1,
    });
    if (!ok) throw new BadRequestException("Mã 2FA không đúng");
    return true;
  }
}
