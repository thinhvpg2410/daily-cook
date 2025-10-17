import {
  Body,
  Controller,
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

@UseGuards(JwtAuthGuard)
@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

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
}
