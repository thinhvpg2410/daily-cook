import { Module } from "@nestjs/common";
import { AIModule } from "../ai/ai.module";
import { ShoppingListController } from "./shopping-list.controller";
import { ShoppingListService } from "./shopping-list.service";

@Module({
  imports: [AIModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
})
export class ShoppingListModule {}
