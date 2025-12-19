import { Module } from "@nestjs/common";
import { PriceScraperService } from "./price-scraper.service";
import { PriceScraperScheduler } from "./price-scraper.scheduler";
import { PriceScraperController } from "./price-scraper.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PriceScraperController],
  providers: [PriceScraperService, PriceScraperScheduler],
  exports: [PriceScraperService],
})
export class PriceScraperModule {}

