import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { FoodLogService } from "./food-log.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { CreateFoodLogDto } from "./dto/create-food-log.dto";
import { UpdateFoodLogDto } from "./dto/update-food-log.dto";
import { QueryFoodLogDto } from "./dto/query-food-log.dto";

@ApiTags("Food Logs")
@UseGuards(JwtAuthGuard)
@Controller("food-logs")
export class FoodLogController {
  constructor(private readonly service: FoodLogService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Tạo bản ghi ăn uống mới" })
  @ApiResponse({ status: 201, description: "Tạo bản ghi thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  create(@CurrentUser() user: any, @Body() dto: CreateFoodLogDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy danh sách bản ghi ăn uống" })
  @ApiResponse({ status: 200, description: "Danh sách bản ghi ăn uống" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  findAll(@CurrentUser() user: any, @Query() query: QueryFoodLogDto) {
    return this.service.findAll(user.userId, query);
  }

  @Get("stats")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thống kê dinh dưỡng theo khoảng thời gian" })
  @ApiQuery({ name: "start", description: "Ngày bắt đầu (ISO 8601)", required: true })
  @ApiQuery({ name: "end", description: "Ngày kết thúc (ISO 8601)", required: true })
  @ApiResponse({ status: 200, description: "Thống kê dinh dưỡng" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getStats(
    @CurrentUser() user: any,
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    return this.service.getStats(user.userId, start, end);
  }

  @Get("cooking-stats")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thống kê món nấu nhiều nhất" })
  @ApiQuery({ name: "limit", description: "Số lượng món muốn lấy", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Thống kê món nấu nhiều nhất" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getCookingStats(
    @CurrentUser() user: any,
    @Query("limit") limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.service.getCookingStats(user.userId, limitNum);
  }

  @Get("cooking-history")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy lịch sử nấu ăn với logic nhắc nhở tránh trùng lặp thông minh" })
  @ApiQuery({ name: "start", description: "Ngày bắt đầu (ISO 8601)", required: false })
  @ApiQuery({ name: "end", description: "Ngày kết thúc (ISO 8601)", required: false })
  @ApiResponse({ status: 200, description: "Lịch sử nấu ăn với cảnh báo" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getCookingHistory(
    @CurrentUser() user: any,
    @Query() query: QueryFoodLogDto,
  ) {
    return this.service.getCookingHistory(user.userId, query);
  }

  @Get(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thông tin chi tiết bản ghi ăn uống" })
  @ApiParam({ name: "id", description: "ID bản ghi" })
  @ApiResponse({ status: 200, description: "Thông tin bản ghi" })
  @ApiResponse({ status: 404, description: "Không tìm thấy bản ghi" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Patch(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Cập nhật bản ghi ăn uống" })
  @ApiParam({ name: "id", description: "ID bản ghi" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy bản ghi" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateFoodLogDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Xóa bản ghi ăn uống" })
  @ApiParam({ name: "id", description: "ID bản ghi" })
  @ApiResponse({ status: 200, description: "Xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy bản ghi" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.remove(user.userId, id);
  }
}

