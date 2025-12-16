import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth("JWT-auth")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Lấy thống kê tổng quan" })
  @ApiResponse({ status: 200, description: "Thống kê tổng quan" })
  getStats() {
    return this.adminService.getStats();
  }

  @Get("users")
  @ApiOperation({ summary: "Lấy danh sách người dùng" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Danh sách người dùng" })
  getUsers(@Query() params: { page?: number; limit?: number; search?: string }) {
    return this.adminService.getUsers(params);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Lấy thông tin người dùng" })
  @ApiResponse({ status: 200, description: "Thông tin người dùng" })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng" })
  getUser(@Param("id") id: string) {
    return this.adminService.getUser(id);
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Cập nhật vai trò người dùng" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng" })
  updateUserRole(@Param("id") id: string, @Body() body: { role: "USER" | "ADMIN" }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Delete("users/:id")
  @ApiOperation({ summary: "Xóa người dùng" })
  @ApiResponse({ status: 200, description: "Xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng" })
  deleteUser(@Param("id") id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get("recipes")
  @ApiOperation({ summary: "Lấy danh sách công thức" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Danh sách công thức" })
  getRecipes(@Query() params: { page?: number; limit?: number; search?: string }) {
    return this.adminService.getRecipes(params);
  }

  @Get("recipes/:id")
  @ApiOperation({ summary: "Lấy thông tin công thức" })
  @ApiResponse({ status: 200, description: "Thông tin công thức" })
  @ApiResponse({ status: 404, description: "Không tìm thấy công thức" })
  getRecipe(@Param("id") id: string) {
    return this.adminService.getRecipe(id);
  }

  @Post("recipes")
  @ApiOperation({ summary: "Tạo công thức mới" })
  @ApiResponse({ status: 201, description: "Tạo thành công" })
  createRecipe(@Body() body: any) {
    return this.adminService.createRecipe(body);
  }

  @Patch("recipes/:id")
  @ApiOperation({ summary: "Cập nhật công thức" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy công thức" })
  updateRecipe(@Param("id") id: string, @Body() body: any) {
    return this.adminService.updateRecipe(id, body);
  }

  @Delete("recipes/:id")
  @ApiOperation({ summary: "Xóa công thức" })
  @ApiResponse({ status: 200, description: "Xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy công thức" })
  deleteRecipe(@Param("id") id: string) {
    return this.adminService.deleteRecipe(id);
  }

  @Post("ingredients/:id/fetch-price")
  @ApiOperation({ summary: "Lấy giá nguyên liệu từ thị trường" })
  @ApiResponse({ status: 200, description: "Lấy giá thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy nguyên liệu" })
  fetchIngredientPrice(@Param("id") id: string) {
    return this.adminService.fetchIngredientPrice(id);
  }

  @Get("mealplans")
  @ApiOperation({ summary: "Lấy danh sách kế hoạch bữa ăn" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiResponse({ status: 200, description: "Danh sách kế hoạch bữa ăn" })
  getMealPlans(@Query() params: { page?: number; limit?: number; userId?: string }) {
    return this.adminService.getMealPlans(params);
  }

  @Get("food-logs")
  @ApiOperation({ summary: "Lấy danh sách nhật ký ăn uống" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiResponse({ status: 200, description: "Danh sách nhật ký ăn uống" })
  getFoodLogs(@Query() params: { page?: number; limit?: number; userId?: string }) {
    return this.adminService.getFoodLogs(params);
  }

  @Get("ingredients")
  @ApiOperation({ summary: "Lấy danh sách nguyên liệu" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Danh sách nguyên liệu" })
  getIngredients(@Query() params: { page?: number; limit?: number; search?: string }) {
    return this.adminService.getIngredients(params);
  }

  @Post("ingredients")
  @ApiOperation({ summary: "Tạo nguyên liệu mới" })
  @ApiResponse({ status: 201, description: "Tạo thành công" })
  createIngredient(@Body() body: any) {
    return this.adminService.createIngredient(body);
  }

  @Patch("ingredients/:id")
  @ApiOperation({ summary: "Cập nhật nguyên liệu" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy nguyên liệu" })
  updateIngredient(@Param("id") id: string, @Body() body: any) {
    return this.adminService.updateIngredient(id, body);
  }

  @Delete("ingredients/:id")
  @ApiOperation({ summary: "Xóa nguyên liệu" })
  @ApiResponse({ status: 200, description: "Xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy nguyên liệu" })
  deleteIngredient(@Param("id") id: string) {
    return this.adminService.deleteIngredient(id);
  }
}

