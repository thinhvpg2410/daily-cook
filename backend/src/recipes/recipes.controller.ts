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
import { RecipesService } from "./recipes.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { QueryRecipeDto } from "./dto/query-recipe.dto";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRecipeDto) {
    return this.recipes.create(user.userId, dto);
  }

  @Get()
  search(@Query() q: QueryRecipeDto) {
    return this.recipes.search(q);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.recipes.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/favorite")
  checkFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.isFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/favorite")
  addFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.addFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/favorite")
  removeFavorite(@CurrentUser() user: any, @Param("id") id: string) {
    return this.recipes.removeFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/favorites")
  getFavorites(@CurrentUser() user: any) {
    return this.recipes.getFavorites(user.userId);
  }
}
