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

  // Specific routes must come before parameterized routes
  @Get("today-suggest")
  async getTodaySuggest(@CurrentUser() u: any, @Query("slot") slot?: string) {
    return this.s.getTodaySuggest(u.userId, slot);
  }

  @Get("shopping/from-range")
  toShopping(
    @CurrentUser() u: any,
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    return this.s.shoppingListFromRange(u.userId, start, end);
  }

  @Post("copy-week")
  copyWeek(@CurrentUser() u: any, @Body() dto: CopyWeekDto) {
    return this.s.copyWeek(u.userId, dto.from, dto.to);
  }

  @Post("suggest")
  async suggestMeal(@CurrentUser() u: any, @Body() body: any) {
    const { region, dietType, targetKcal } = body;
    return this.s.suggestMeal(u.userId, region, dietType, targetKcal);
  }

  @Post("suggest-menu")
  async suggestMenu(@CurrentUser() u: any, @Body() dto: SuggestMenuDto) {
    return this.s.suggestMenu(u.userId, dto);
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
}
