import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { RecipesModule } from "./recipes/recipes.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { MealPlanModule } from "./mealplan/mealplan.module";
import { ShoppingListModule } from "./shopping-list/shopping-list.module";
import { FoodLogModule } from "./food-log/food-log.module";
import { AIModule } from "./ai/ai.module";
import { PriceScraperModule } from "./price-scraper/price-scraper.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    RecipesModule,
    MealPlanModule,
    ShoppingListModule,
    FoodLogModule,
    AIModule,
    PriceScraperModule,
  ],
})
export class AppModule {}
