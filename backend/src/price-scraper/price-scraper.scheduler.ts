import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PriceScraperService } from "./price-scraper.service";

@Injectable()
export class PriceScraperScheduler {
  private readonly logger = new Logger(PriceScraperScheduler.name);

  constructor(private priceScraperService: PriceScraperService) {}

  /**
   * Run daily at 6:00 AM to update ingredient prices
   */
  @Cron("0 6 * * *", {
    name: "daily-price-update",
    timeZone: "Asia/Ho_Chi_Minh",
  })
  async handleDailyPriceUpdate() {
    this.logger.log("Starting scheduled daily price update at 6:00 AM");
    try {
      await this.priceScraperService.updateAllIngredientPrices();
      this.logger.log("Scheduled daily price update completed successfully");
    } catch (error) {
      this.logger.error(
        `Error in scheduled daily price update: ${error.message}`,
        error.stack,
      );
    }
  }
}

