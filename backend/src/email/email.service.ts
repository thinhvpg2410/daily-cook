import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "node-mailjet";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailjet: Client | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("MAILJET_API_KEY");
    const apiSecret = this.configService.get<string>("MAILJET_API_SECRET");

    if (apiKey && apiSecret) {
      this.mailjet = new Client({
        apiKey,
        apiSecret,
      });
      this.logger.log("Mailjet initialized successfully");
    } else {
      this.logger.warn(
        "Mailjet credentials not found. Email sending will be disabled. Please set MAILJET_API_KEY and MAILJET_API_SECRET in .env"
      );
    }
  }

  async sendForgotPasswordEmail(email: string, code: string, userName?: string): Promise<void> {
    if (!this.mailjet) {
      this.logger.error("Mailjet not initialized. Cannot send email.");
      throw new Error("Email service is not configured");
    }

    const fromEmail = this.configService.get<string>("MAILJET_FROM_EMAIL") || "noreply@dailycook.com";
    const fromName = this.configService.get<string>("MAILJET_FROM_NAME") || "DailyCook";

    const emailHtml = this.getForgotPasswordEmailTemplate(code, userName || "Người dùng");

    try {
      const result = await this.mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: fromEmail,
              Name: fromName,
            },
            To: [
              {
                Email: email,
                Name: userName || "Người dùng",
              },
            ],
            Subject: "Mã xác thực đặt lại mật khẩu - DailyCook",
            HTMLPart: emailHtml,
            TextPart: `Mã xác thực đặt lại mật khẩu của bạn là: ${code}. Mã này có hiệu lực trong 10 phút.`,
          },
        ],
      });

      this.logger.log(`Password reset email sent successfully to ${email}`);
      return result.body as any;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      throw new Error(`Failed to send email: ${error.message || "Unknown error"}`);
    }
  }

  private getForgotPasswordEmailTemplate(code: string, userName: string): string {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại mật khẩu - DailyCook</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0; text-align: center;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 20px; text-align: center; background-color: #e53935; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">DailyCook</h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Thực Đơn Nhà Mình</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Xin chào ${userName}!</h2>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
                                Vui lòng sử dụng mã xác thực bên dưới để tiếp tục:
                            </p>
                            
                            <!-- OTP Code Box -->
                            <div style="background-color: #f8f9fa; border: 2px dashed #e53935; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: bold;">MÃ XÁC THỰC</p>
                                <p style="margin: 0; color: #e53935; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                    ${code}
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                <strong>Lưu ý:</strong> Mã này có hiệu lực trong <strong style="color: #e53935;">10 phút</strong>. 
                                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                            </p>
                            
                            <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                                Đây là email tự động, vui lòng không trả lời email này. 
                                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua ứng dụng.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                © ${new Date().getFullYear()} DailyCook - Thực Đơn Nhà Mình. Tất cả quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
  }
}

