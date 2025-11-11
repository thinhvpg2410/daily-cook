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
import { FoodLogService } from "./food-log.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { CreateFoodLogDto } from "./dto/create-food-log.dto";
import { UpdateFoodLogDto } from "./dto/update-food-log.dto";
import { QueryFoodLogDto } from "./dto/query-food-log.dto";

@UseGuards(JwtAuthGuard)
@Controller("food-logs")
export class FoodLogController {
  constructor(private readonly service: FoodLogService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateFoodLogDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryFoodLogDto) {
    return this.service.findAll(user.userId, query);
  }

  @Get("stats")
  getStats(
    @CurrentUser() user: any,
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    return this.service.getStats(user.userId, start, end);
  }

  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateFoodLogDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.remove(user.userId, id);
  }
}

