import { Module, forwardRef } from "@nestjs/common";
import { MealPlanController } from "./mealplan.controller";
import { MealPlanService } from "./mealplan.service";
import { AIModule } from "../ai/ai.module";

@Module({
  imports: [forwardRef(() => AIModule)],
  controllers: [MealPlanController],
  providers: [MealPlanService],
  exports: [MealPlanService],
})
export class MealPlanModule {}
