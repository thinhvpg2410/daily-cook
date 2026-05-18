import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS before helmet to avoid conflicts
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Type", "Authorization"],
  });

  // Configure helmet with CORS-friendly settings
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle("DailyCook API")
    .setDescription(
      `
      API Documentation cho ứng dụng DailyCook - Ứng dụng quản lý bữa ăn và dinh dưỡng.
      
      ## Tính năng chính:
      - **Authentication**: Đăng ký, đăng nhập, xác thực 2 yếu tố (2FA), quên mật khẩu
      - **Recipes**: Quản lý công thức nấu ăn, tìm kiếm, yêu thích
      - **Meal Plans**: Lập kế hoạch bữa ăn theo tuần, gợi ý thực đơn
      - **Food Logs**: Ghi chép bữa ăn và theo dõi dinh dưỡng
      - **Shopping List**: Tạo danh sách mua sắm từ công thức và kế hoạch bữa ăn
      - **Users**: Quản lý profile và tùy chọn người dùng
      
      ## Xác thực:
      Hầu hết các endpoint yêu cầu xác thực JWT. Sử dụng nút "Authorize" ở trên để thêm Bearer token.
    `,
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Nhập JWT token",
        in: "header",
      },
      "JWT-auth", // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag("Health Check", "Kiểm tra trạng thái API")
    .addTag("Authentication", "Xác thực và quản lý người dùng")
    .addTag("Recipes", "Quản lý công thức nấu ăn")
    .addTag("Meal Plans", "Kế hoạch bữa ăn")
    .addTag("Food Logs", "Ghi chép bữa ăn và dinh dưỡng")
    .addTag("Users", "Quản lý người dùng")
    .addTag("Shopping List", "Danh sách mua sắm")
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, doc, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
    customSiteTitle: "DailyCook API Documentation",
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 DailyCook API running on http://localhost:${port}`);
}

bootstrap();
