import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { PrismaService } from "../prisma/prisma.service";

export interface NormalizedPrice {
  name: string;
  unit: string;
  pricePerUnit: number;
  currency: string;
  source: string;
}

@Injectable()
export class PriceScraperService {
  private readonly logger = new Logger(PriceScraperService.name);
  private readonly BASE_URL = "https://www.bachhoaxanh.com";
  private readonly SEARCH_URL = `${this.BASE_URL}/tim-kiem`;

  // Keyword mapping: ingredient name -> search keyword
  private readonly keywordMapping: Record<string, string> = {
    "gạo tẻ": "gạo",
    "thịt heo nạc": "thịt heo",
    "thịt heo": "thịt heo",
    "cá hồi": "cá hồi",
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Map ingredient name to search keyword
   */
  private mapKeyword(ingredientName: string): string {
    const normalized = ingredientName.toLowerCase().trim();
    return this.keywordMapping[normalized] || normalized;
  }

  /**
   * Normalize unit: 500g, 1kg -> g; 1 lít -> ml; Chai -> chai; Gói -> gói
   */
  private normalizeUnit(unit: string): string {
    if (!unit) return "g";
    const normalized = unit.toLowerCase().trim();

    // Convert kg to g
    if (normalized.includes("kg")) {
      return "g";
    }

    // Convert lít/liter to ml
    if (normalized.includes("lít") || normalized.includes("liter") || normalized.includes("l")) {
      return "ml";
    }

    // Keep chai, gói as is
    if (normalized.includes("chai")) {
      return "chai";
    }
    if (normalized.includes("gói")) {
      return "gói";
    }

    // Default to g
    return "g";
  }

  /**
   * Extract and normalize price from text
   * Examples:
   * - "89.000đ" -> 89000
   * - "22.000đ/500g" -> 44 (VND/g)
   * - "150.000đ/kg" -> 150 (VND/g)
   */
  private normalizePrice(priceText: string, unit: string): { pricePerUnit: number; unit: string } | null {
    if (!priceText) return null;

    // Remove all spaces and convert to lowercase
    const cleaned = priceText.replace(/\s/g, "").toLowerCase();

    // Extract price (remove đ, commas, dots) - handle both "89.000" and "89000" formats
    const priceMatch = cleaned.match(/(\d+(?:[.,]\d+)*)/);
    if (!priceMatch) return null;

    // Parse price: remove dots and commas, then parse
    const priceStr = priceMatch[1];
    // Vietnamese format: dots are thousands separators
    let price: number;
    if (priceStr.includes(".") && priceStr.split(".").length > 2) {
      // Format like "89.000" (thousands separator)
      price = parseFloat(priceStr.replace(/\./g, ""));
    } else if (priceStr.includes(",")) {
      // Format like "89,000" (thousands separator)
      price = parseFloat(priceStr.replace(/,/g, ""));
    } else {
      price = parseFloat(priceStr);
    }

    if (isNaN(price) || price <= 0) return null;

    // Check if price includes unit (e.g., "22.000đ/500g", "150.000đ/kg")
    const unitMatch = cleaned.match(/\/(\d+(?:[.,]\d+)*)\s*(g|kg|ml|l|lít|liter|chai|gói)/i);
    if (unitMatch) {
      const quantityStr = unitMatch[1].replace(/[,.]/g, "");
      const quantity = parseFloat(quantityStr);
      const priceUnit = unitMatch[2].toLowerCase();

      if (isNaN(quantity) || quantity <= 0) return null;

      // Convert to base unit
      if (priceUnit === "kg") {
        price = price / (quantity * 1000); // Convert to price per gram
        return { pricePerUnit: Math.round(price * 100) / 100, unit: "g" };
      } else if (priceUnit === "l" || priceUnit === "lít" || priceUnit === "liter") {
        price = price / (quantity * 1000); // Convert to price per ml
        return { pricePerUnit: Math.round(price * 100) / 100, unit: "ml" };
      } else if (priceUnit === "chai" || priceUnit === "gói") {
        price = price / quantity;
        return { pricePerUnit: Math.round(price * 100) / 100, unit: priceUnit };
      } else {
        // g or ml
        price = price / quantity;
        return { pricePerUnit: Math.round(price * 100) / 100, unit: priceUnit };
      }
    }

    // If no unit specified, assume it's the total price for the default unit
    const normalizedUnit = this.normalizeUnit(unit);
    return { pricePerUnit: Math.round(price * 100) / 100, unit: normalizedUnit };
  }

  /**
   * Search for product on Bách Hóa Xanh
   */
  private async searchProduct(
    browser: puppeteer.Browser,
    keyword: string,
  ): Promise<NormalizedPrice | null> {
    const page = await browser.newPage();
    try {
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to search page
      const searchUrl = `${this.SEARCH_URL}?key=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for search results to load
      await page.waitForSelector(".product-item, .product, [class*='product']", {
        timeout: 10000,
      }).catch(() => {
        this.logger.warn(`No products found for keyword: ${keyword}`);
      });

      // Try to find the first product
      const productData = await page.evaluate(() => {
        // Try multiple selectors for product items (querySelectorAll to get first)
        const selectors = [
          ".product-item",
          ".product",
          "[class*='product']",
          ".item-product",
          ".product-card",
          "article",
          "[data-product-id]",
        ];

        let productElement: Element | null = null;
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            productElement = elements[0];
            break;
          }
        }

        if (!productElement) {
          // Try to find any element with price-like text
          const allElements = document.querySelectorAll("*");
          for (const el of allElements) {
            const text = el.textContent || "";
            if (text.match(/\d+[.,]\d+\s*đ/i)) {
              productElement = el;
              break;
            }
          }
        }

        if (!productElement) return null;

        // Try to extract product name
        const nameSelectors = [
          ".product-name",
          ".name",
          "h3",
          "h2",
          "[class*='name']",
          "a[title]",
        ];
        let name = "";
        for (const selector of nameSelectors) {
          const nameEl = productElement.querySelector(selector);
          if (nameEl) {
            name = nameEl.textContent?.trim() || nameEl.getAttribute("title") || "";
            if (name) break;
          }
        }

        // Try to extract price
        const priceSelectors = [
          ".price",
          ".product-price",
          "[class*='price']",
          ".current-price",
          ".price-current",
        ];
        let price = "";
        for (const selector of priceSelectors) {
          const priceEl = productElement.querySelector(selector);
          if (priceEl) {
            price = priceEl.textContent?.trim() || "";
            if (price) break;
          }
        }

        // Try to extract unit/weight
        const unitSelectors = [
          ".unit",
          ".weight",
          "[class*='unit']",
          "[class*='weight']",
          ".product-weight",
        ];
        let unit = "";
        for (const selector of unitSelectors) {
          const unitEl = productElement.querySelector(selector);
          if (unitEl) {
            unit = unitEl.textContent?.trim() || "";
            if (unit) break;
          }
        }

        return { name, price, unit };
      });

      if (!productData || !productData.price) {
        this.logger.warn(`Could not extract product data for keyword: ${keyword}`);
        return null;
      }

      // Normalize price
      const normalizedPrice = this.normalizePrice(productData.price, productData.unit);
      if (!normalizedPrice) {
        this.logger.warn(`Could not normalize price for keyword: ${keyword}, price: ${productData.price}`);
        return null;
      }

      return {
        name: productData.name || keyword,
        unit: normalizedPrice.unit,
        pricePerUnit: normalizedPrice.pricePerUnit,
        currency: "VND",
        source: `Bách Hóa Xanh - ${new Date().toLocaleDateString("vi-VN")}`,
      };
    } catch (error) {
      this.logger.error(`Error searching for product "${keyword}": ${error.message}`);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape prices for multiple ingredients
   */
  async scrapePrices(
    ingredients: Array<{ name: string; unit?: string }>,
  ): Promise<Record<string, NormalizedPrice>> {
    if (!ingredients.length) return {};

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const results: Record<string, NormalizedPrice> = {};

    try {
      for (const ingredient of ingredients) {
        const keyword = this.mapKeyword(ingredient.name);
        this.logger.log(`Searching for: ${ingredient.name} (keyword: ${keyword})`);

        const price = await this.searchProduct(browser, keyword);
        if (price) {
          // Use original ingredient name as key
          const key = ingredient.name.trim().toLowerCase();
          results[key] = price;
          this.logger.log(
            `Found price for ${ingredient.name}: ${price.pricePerUnit} ${price.currency}/${price.unit}`,
          );
        } else {
          this.logger.warn(`No price found for: ${ingredient.name}`);
        }

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } finally {
      await browser.close();
    }

    return results;
  }

  /**
   * Update prices for all ingredients in database
   * This method updates ALL ingredients regardless of whether they already have prices
   */
  async updateAllIngredientPrices(): Promise<void> {
    this.logger.log("Starting daily price update for ALL ingredients (including those with existing prices)...");

    // Get ALL ingredients - no filtering by priceUpdatedAt
    const ingredients = await this.prisma.ingredient.findMany({
      select: { id: true, name: true, unit: true },
    });

    if (!ingredients.length) {
      this.logger.log("No ingredients found in database");
      return;
    }

    this.logger.log(`Found ${ingredients.length} ingredients to update (all ingredients will be processed)`);

    // Scrape prices for all ingredients
    const priceMap = await this.scrapePrices(
      ingredients.map((ing) => ({ name: ing.name, unit: ing.unit || undefined })),
    );

    // Update database - update ALL ingredients, even if price not found
    const now = new Date();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const ingredient of ingredients) {
      const key = ingredient.name.trim().toLowerCase();
      const price = priceMap[key];

      if (price && price.pricePerUnit > 0) {
        // Update with new price
        await this.prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            pricePerUnit: price.pricePerUnit,
            priceCurrency: price.currency,
            priceUpdatedAt: now,
          },
        });
        updatedCount++;
        this.logger.log(
          `Updated price for ${ingredient.name}: ${price.pricePerUnit} ${price.currency}/${price.unit}`,
        );
      } else {
        // Still update priceUpdatedAt to mark that we checked this ingredient today
        // Keep existing price if available, but update the timestamp
        await this.prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            priceUpdatedAt: now,
          },
        });
        skippedCount++;
        this.logger.warn(
          `No price found for ${ingredient.name}, but marked as checked (keeping existing price if any)`,
        );
      }
    }

    this.logger.log(
      `Price update completed. Updated ${updatedCount}/${ingredients.length} ingredients with new prices, ${skippedCount} ingredients checked but no new price found`,
    );
  }
}

