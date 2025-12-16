import { Controller, Post, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { PriceScraperService } from "./price-scraper.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@ApiTags("Price Scraper")
@Controller("price-scraper")
export class PriceScraperController {
  private readonly logger = new Logger(PriceScraperController.name);

  constructor(private readonly priceScraperService: PriceScraperService) {}

  @Post("update-all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Manually trigger price update for all ingredients" })
  @ApiResponse({ status: 200, description: "Price update triggered successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateAllPrices() {
    this.logger.log("Manual price update triggered");
    await this.priceScraperService.updateAllIngredientPrices();
    return { message: "Price update completed" };
  }
}

