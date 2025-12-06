import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { TotpService } from "./totp.service";
import * as speakeasy from "speakeasy";

jest.mock("speakeasy");

describe("TotpService", () => {
  let service: TotpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TotpService],
    }).compile();

    service = module.get<TotpService>(TotpService);
    jest.clearAllMocks();
  });

  describe("generateSecret", () => {
    it("should generate a secret with label", () => {
      const label = "Test App (user@example.com)";
      const mockSecret = {
        ascii: "JBSWY3DPEHPK3PXP",
        base32: "KBAWY3DPEHPK3PXP",
        hex: "48656c6c6f21deadbeef",
        qr_code_ascii: "otpauth://totp/...",
        otpauth_url: "otpauth://totp/Test%20App%20%28user%40example.com%29?secret=JBSWY3DPEHPK3PXP",
      };

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);

      const result = service.generateSecret(label);

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        length: 20,
        name: label,
      });
      expect(result).toEqual(mockSecret);
    });
  });

  describe("verify", () => {
    it("should verify valid TOTP token", () => {
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = service.verify(token, secret);

      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        token,
        secret,
        encoding: "ascii",
        window: 1,
      });
      expect(result).toBe(true);
    });

    it("should throw BadRequestException for invalid token", () => {
      const token = "000000";
      const secret = "JBSWY3DPEHPK3PXP";

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      expect(() => service.verify(token, secret)).toThrow(
        BadRequestException
      );
      expect(() => service.verify(token, secret)).toThrow("Mã 2FA không đúng");
    });
  });
});
