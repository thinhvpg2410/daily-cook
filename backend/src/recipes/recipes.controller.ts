import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { RecipesService } from "./recipes.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { QueryRecipeDto } from "./dto/query-recipe.dto";

@ApiTags("Recipes")
@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Tạo công thức mới" })
  @ApiResponse({ status: 201, description: "Tạo công thức thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  create(@CurrentUser() user: any, @Body() dto: CreateRecipeDto) {
    return this.recipes.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Tìm kiếm công thức" })
  @ApiResponse({ status: 200, description: "Danh sách công thức" })
  search(@Query() q: QueryRecipeDto) {
    return this.recipes.search(q);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy danh sách công thức của người dùng hiện tại" })
  @ApiResponse({ status: 200, description: "Danh sách công thức" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getMyRecipes(@CurrentUser() user: any) {
    return this.recipes.getByAuthorId(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/favorites")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Lấy danh sách công thức yêu thích của người dùng" })
  @ApiResponse({ status: 200, description: "Danh sách công thức yêu thích" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  getFavorites(@CurrentUser() user: any) {
    return this.recipes.getFavorites(user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết công thức" })
  @ApiParam({ name: "id", description: "ID công thức" })
  @ApiResponse({ status: 200, description: "Thông tin công thức" })
  @ApiResponse({ status: 404, description: "Không tìm thấy công thức" })
  get(@Param("id") id: string) {
    return this.recipes.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/favorite")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Kiểm tra công thức có trong danh sách yêu thích" })
  @ApiParam({ name: "id", description: "ID công thức" })
  @ApiResponse({ status: 200, description: "Trạng thái yêu thích" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  checkFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.isFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/favorite")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Thêm công thức vào danh sách yêu thích" })
  @ApiParam({ name: "id", description: "ID công thức" })
  @ApiResponse({ status: 201, description: "Đã thêm vào danh sách yêu thích" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  addFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.addFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/favorite")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Xóa công thức khỏi danh sách yêu thích" })
  @ApiParam({ name: "id", description: "ID công thức" })
  @ApiResponse({ status: 200, description: "Đã xóa khỏi danh sách yêu thích" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  removeFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.removeFavorite(user.userId, id);
  }
}
