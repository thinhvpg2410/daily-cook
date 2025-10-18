import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ShoppingListService } from "./shopping-list.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("shopping-list")
export class ShoppingListController {
  constructor(private readonly s: ShoppingListService) {}

  @Post("from-recipes")
  fromRecipes(
    @CurrentUser() user: any,
    @Body() body: { title?: string; recipeIds: string[]; persist?: boolean },
  ) {
    const { title = "Danh sách mua sắm", recipeIds, persist = true } = body;
    return this.s.buildFromRecipes(user.userId, recipeIds, title, persist);
  }
}
