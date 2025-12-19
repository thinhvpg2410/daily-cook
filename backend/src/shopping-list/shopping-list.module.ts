import { Module } from "@nestjs/common";
import { AIModule } from "../ai/ai.module";
import { PriceScraperModule } from "../price-scraper/price-scraper.module";
import { ShoppingListController } from "./shopping-list.controller";
import { ShoppingListService } from "./shopping-list.service";

@Module({
  imports: [AIModule, PriceScraperModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
})
export class ShoppingListModule {}
