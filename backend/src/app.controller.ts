import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags("Health Check")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Kiểm tra trạng thái API" })
  @ApiResponse({ status: 200, description: "API đang hoạt động" })
  getHello(): string {
    return this.appService.getHello();
  }
}
