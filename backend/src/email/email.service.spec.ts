import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";
import { Client } from "node-mailjet";

jest.mock("node-mailjet");

describe("EmailService", () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockMailjetClient: jest.Mocked<Client>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPost = jest.fn();
  const mockRequest = jest.fn();

  beforeEach(async () => {
    mockPost.mockReturnValue({
      request: mockRequest,
    });

    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => {
      return {
        post: mockPost,
      } as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize Mailjet client when credentials are provided", () => {
      mockConfigService.get
        .mockReturnValueOnce("test_api_key")
        .mockReturnValueOnce("test_api_secret");

      const newService = new EmailService(configService);

      expect(Client).toHaveBeenCalledWith({
        apiKey: "test_api_key",
        apiSecret: "test_api_secret",
      });
    });

    it("should not initialize Mailjet when credentials are missing", () => {
      mockConfigService.get.mockReturnValue(undefined);

      const newService = new EmailService(configService);

      // Mailjet should not be called
      expect((newService as any).mailjet).toBeNull();
    });
  });

  describe("sendForgotPasswordEmail", () => {
    beforeEach(() => {
      mockConfigService.get
        .mockReturnValueOnce("test_api_key")
        .mockReturnValueOnce("test_api_secret")
        .mockReturnValueOnce("noreply@dailycook.com")
        .mockReturnValueOnce("DailyCook");
    });

    it("should send forgot password email successfully", async () => {
      const email = "user@example.com";
      const code = "123456";
      const userName = "Test User";

      mockRequest.mockResolvedValue({
        body: { success: true },
      });

      const result = await service.sendForgotPasswordEmail(
        email,
        code,
        userName
      );

      expect(mockPost).toHaveBeenCalledWith("send", { version: "v3.1" });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          Messages: expect.arrayContaining([
            expect.objectContaining({
              From: expect.objectContaining({
                Email: "noreply@dailycook.com",
                Name: "DailyCook",
              }),
              To: expect.arrayContaining([
                expect.objectContaining({
                  Email: email,
                  Name: userName,
                }),
              ]),
              Subject: "Mã xác thực đặt lại mật khẩu - DailyCook",
            }),
          ]),
        })
      );
      expect(result).toEqual({ success: true });
    });

    it("should use default from email/name if not configured", async () => {
      mockConfigService.get
        .mockReturnValueOnce("test_api_key")
        .mockReturnValueOnce("test_api_secret")
        .mockReturnValueOnce(undefined) // MAILJET_FROM_EMAIL
        .mockReturnValueOnce(undefined); // MAILJET_FROM_NAME

      const newService = new EmailService(configService);
      const email = "user@example.com";
      const code = "123456";

      mockRequest.mockResolvedValue({
        body: { success: true },
      });

      await newService.sendForgotPasswordEmail(email, code);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          Messages: expect.arrayContaining([
            expect.objectContaining({
              From: expect.objectContaining({
                Email: "noreply@dailycook.com",
                Name: "DailyCook",
              }),
            }),
          ]),
        })
      );
    });

    it("should throw error if Mailjet is not initialized", async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const newService = new EmailService(configService);

      await expect(
        newService.sendForgotPasswordEmail("user@example.com", "123456")
      ).rejects.toThrow("Email service is not configured");
    });

    it("should handle email sending errors", async () => {
      const email = "user@example.com";
      const code = "123456";

      mockRequest.mockRejectedValue(new Error("SMTP Error"));

      await expect(
        service.sendForgotPasswordEmail(email, code)
      ).rejects.toThrow();
    });
  });
});
