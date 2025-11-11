import { Module } from "@nestjs/common";
import { FoodLogController } from "./food-log.controller";
import { FoodLogService } from "./food-log.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FoodLogController],
  providers: [FoodLogService],
})
export class FoodLogModule {}

