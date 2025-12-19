import { Module, forwardRef } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PriceScraperModule } from "../price-scraper/price-scraper.module";

@Module({
  imports: [forwardRef(() => PriceScraperModule)],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

