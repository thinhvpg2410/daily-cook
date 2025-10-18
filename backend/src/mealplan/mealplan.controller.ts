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
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { MealPlanService } from "./mealplan.service";
import { CreateMealPlanDto } from "./dto/create-mealplan.dto";
import { UpdateMealPlanDto } from "./dto/update-mealplan.dto";
import { QueryMealPlanDto } from "./dto/query-mealplan.dto";
import { PatchSlotDto } from "./dto/patch-slot.dto";
import { CopyWeekDto } from "./dto/copy-week.dto";
import { SuggestMenuDto } from "./dto/suggest-menu.dto";

@UseGuards(JwtAuthGuard)
@Controller("mealplans")
export class MealPlanController {
  constructor(private readonly s: MealPlanService) {}

  @Get()
  getRange(@CurrentUser() u: any, @Query() q: QueryMealPlanDto) {
    return this.s.getRange(u.userId, q);
  }

  @Put()
  upsert(@CurrentUser() u: any, @Body() dto: CreateMealPlanDto) {
    return this.s.upsert(u.userId, dto);
  }

  @Get(":id")
  getOne(@CurrentUser() u: any, @Param("id") id: string) {
    return this.s.findOne(u.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.s.update(u.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() u: any, @Param("id") id: string) {
    return this.s.remove(u.userId, id);
  }

  @Patch(":id/slot")
  patchSlot(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() dto: PatchSlotDto,
  ) {
    return this.s.patchSlot(u.userId, id, dto);
  }

  @Post("copy-week")
  copyWeek(@CurrentUser() u: any, @Body() dto: CopyWeekDto) {
    return this.s.copyWeek(u.userId, dto.from, dto.to);
  }

  @Get("shopping/from-range")
  toShopping(
    @CurrentUser() u: any,
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    return this.s.shoppingListFromRange(u.userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Post("suggest")
  async suggestMeal(@Body() body: any, @Req() req: any) {
    const userId = req.user.userId;
    const { region, dietType, targetKcal } = body;
    return this.s.suggestMeal(userId, region, dietType, targetKcal);
  }
}
