import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { MealPlanService } from "./mealplan.service";
import { CreateMealPlanDto } from "./dto/create-mealplan.dto";
import { UpdateMealPlanDto } from "./dto/update-mealplan.dto";
import { QueryMealPlanDto } from "./dto/query-mealplan.dto";
import { PatchSlotDto } from "./dto/patch-slot.dto";
import { CopyWeekDto } from "./dto/copy-week.dto";
import { SuggestMenuDto } from "./dto/suggest-menu.dto";

@ApiTags("Meal Plans")
@UseGuards(JwtAuthGuard)
@Controller("mealplans")
export class MealPlanController {
  constructor(private readonly s: MealPlanService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy danh sách kế hoạch bữa ăn theo khoảng thời gian" })
  @ApiResponse({ status: 200, description: "Danh sách kế hoạch bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getRange(@CurrentUser() u: any, @Query() q: QueryMealPlanDto) {
    return this.s.getRange(u.userId, q);
  }

  @Put()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Tạo hoặc cập nhật kế hoạch bữa ăn" })
  @ApiResponse({ status: 200, description: "Tạo/cập nhật thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  upsert(@CurrentUser() u: any, @Body() dto: CreateMealPlanDto) {
    return this.s.upsert(u.userId, dto);
  }

  // Specific routes must come before parameterized routes
  @Get("today-suggest")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy gợi ý bữa ăn cho hôm nay" })
  @ApiQuery({ name: "slot", description: "Loại bữa ăn (breakfast, lunch, dinner)", required: false })
  @ApiResponse({ status: 200, description: "Gợi ý bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  async getTodaySuggest(
    @CurrentUser() u: any,
    @Query("slot") slot?: "breakfast" | "lunch" | "dinner" | "all",
  ) {
    return this.s.getTodaySuggest(u.userId, slot);
  }

  @Get("shopping/from-range")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Tạo danh sách mua sắm từ kế hoạch bữa ăn theo khoảng thời gian" })
  @ApiQuery({ name: "start", description: "Ngày bắt đầu (ISO 8601)", required: true })
  @ApiQuery({ name: "end", description: "Ngày kết thúc (ISO 8601)", required: true })
  @ApiResponse({ status: 200, description: "Danh sách mua sắm" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  toShopping(
    @CurrentUser() u: any,
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    return this.s.shoppingListFromRange(u.userId, start, end);
  }

  @Post("copy-week")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Sao chép kế hoạch bữa ăn từ tuần này sang tuần khác" })
  @ApiResponse({ status: 200, description: "Sao chép thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  copyWeek(@CurrentUser() u: any, @Body() dto: CopyWeekDto) {
    return this.s.copyWeek(u.userId, dto.from, dto.to);
  }

  @Post("suggest")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Gợi ý bữa ăn dựa trên khu vực, chế độ ăn và calo mục tiêu" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        region: { type: "string", description: "Khu vực", example: "vietnam" },
        dietType: { type: "string", description: "Chế độ ăn", example: "vegetarian" },
        targetKcal: { type: "number", description: "Calo mục tiêu", example: 2000 }
      }
    }
  })
  @ApiResponse({ status: 200, description: "Gợi ý bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  async suggestMeal(@CurrentUser() u: any, @Body() body: any) {
    const { region, dietType, targetKcal } = body;
    return this.s.suggestMeal(u.userId, region, dietType, targetKcal);
  }

  @Post("suggest-menu")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Gợi ý thực đơn theo tuần" })
  @ApiResponse({ status: 200, description: "Gợi ý thực đơn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  async suggestMenu(@CurrentUser() u: any, @Body() dto: SuggestMenuDto) {
    return this.s.suggestMenu(u.userId, dto);
  }

  @Get(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy thông tin chi tiết kế hoạch bữa ăn" })
  @ApiParam({ name: "id", description: "ID kế hoạch bữa ăn" })
  @ApiResponse({ status: 200, description: "Thông tin kế hoạch bữa ăn" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kế hoạch bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getOne(@CurrentUser() u: any, @Param("id") id: string) {
    return this.s.findOne(u.userId, id);
  }

  @Patch(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Cập nhật kế hoạch bữa ăn" })
  @ApiParam({ name: "id", description: "ID kế hoạch bữa ăn" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kế hoạch bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  update(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.s.update(u.userId, id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Xóa kế hoạch bữa ăn" })
  @ApiParam({ name: "id", description: "ID kế hoạch bữa ăn" })
  @ApiResponse({ status: 200, description: "Xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kế hoạch bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  remove(@CurrentUser() u: any, @Param("id") id: string) {
    return this.s.remove(u.userId, id);
  }

  @Patch(":id/slot")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Cập nhật một slot bữa ăn trong kế hoạch" })
  @ApiParam({ name: "id", description: "ID kế hoạch bữa ăn" })
  @ApiResponse({ status: 200, description: "Cập nhật slot thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kế hoạch bữa ăn" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  patchSlot(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() dto: PatchSlotDto,
  ) {
    return this.s.patchSlot(u.userId, id, dto);
  }
}
