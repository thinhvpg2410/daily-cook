import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { ShoppingListService } from "./shopping-list.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";

@ApiTags("Shopping List")
@UseGuards(JwtAuthGuard)
@Controller("shopping-list")
export class ShoppingListController {
  constructor(private readonly s: ShoppingListService) {}

  @Post("from-recipes")
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Tạo danh sách mua sắm từ các công thức" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Tiêu đề danh sách", example: "Danh sách mua sắm" },
        recipeIds: { 
          type: "array", 
          items: { type: "string" },
          description: "Danh sách ID công thức",
          example: ["recipe-id-1", "recipe-id-2"]
        },
        persist: { type: "boolean", description: "Lưu danh sách vào database", example: true }
      },
      required: ["recipeIds"]
    }
  })
  @ApiResponse({ status: 201, description: "Tạo danh sách mua sắm thành công" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  fromRecipes(
    @CurrentUser() user: any,
    @Body() body: { title?: string; recipeIds: string[]; persist?: boolean },
  ) {
    const { title = "Danh sách mua sắm", recipeIds, persist = true } = body;
    return this.s.buildFromRecipes(user.userId, recipeIds, title, persist);
  }
}
