import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";
import { PriceScraperService } from "../price-scraper/price-scraper.service";
import { startOfDay } from "date-fns";

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private priceScraperService: PriceScraperService,
  ) {}

  private async ensureDailyIngredientPrices(ingredientIds: string[]) {
    if (!ingredientIds.length) return;
    const todayStart = startOfDay(new Date());

    const pending = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        OR: [{ priceUpdatedAt: null }, { priceUpdatedAt: { lt: todayStart } }],
      },
      select: { id: true, name: true, unit: true },
    });

    if (!pending.length) return;

    try {
      // Try to use price scraper first (Bách Hóa Xanh)
      const priceMap = await this.priceScraperService.scrapePrices(
        pending.map((p) => ({ name: p.name, unit: p.unit || undefined })),
      );

      // If price scraper didn't find all prices, fallback to AI service
      const missingPrices = pending.filter(
        (ing) => !priceMap[ing.name.trim().toLowerCase()],
      );

      if (missingPrices.length > 0 && this.aiService.isEnabled()) {
        this.logger.log(
          `Price scraper found ${Object.keys(priceMap).length}/${pending.length} prices. Trying AI service for ${missingPrices.length} missing prices.`,
        );
        try {
          const aiPriceMap = await this.aiService.fetchIngredientMarketPrices(
            missingPrices.map((p) => ({ name: p.name, unit: p.unit || undefined })),
          );
          // Merge AI prices into price map
          Object.assign(priceMap, aiPriceMap);
        } catch (aiError) {
          this.logger.warn(
            `AI service failed to fetch prices: ${aiError?.message || aiError}`,
          );
        }
      }

      await Promise.all(
        pending.map(async (ing) => {
          const key = ing.name.trim().toLowerCase();
          const info = priceMap[key];
          if (!info || !info.pricePerUnit) return;

          await this.prisma.ingredient.update({
            where: { id: ing.id },
            data: {
              pricePerUnit: info.pricePerUnit,
              priceCurrency: info.currency || "VND",
              priceUpdatedAt: new Date(),
            },
          });
        }),
      );
    } catch (error) {
      // Sau khi retry vẫn lỗi -> không cập nhật giá, để "Theo Thời giá"
      this.logger.warn(
        `Không thể cập nhật giá nguyên liệu sau khi retry: ${error?.message || error}. Giữ nguyên giá cũ hoặc để "Theo Thời giá".`,
      );
      // Không cập nhật pricePerUnit, priceCurrency, priceUpdatedAt
      // Giữ nguyên giá cũ hoặc null (sẽ hiển thị "Theo Thời giá" ở frontend)
    }
  }

  private async attachPriceInfo(
    items: Array<{
      ingredientId: string;
      name: string;
      unit?: string;
      qty: number;
      checked: boolean;
    }>,
  ) {
    if (!items.length) return items;

    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: items.map((i) => i.ingredientId) } },
      select: {
        id: true,
        pricePerUnit: true,
        priceCurrency: true,
        priceUpdatedAt: true,
      },
    });
    type IngredientPriceSelect = {
      id: string;
      pricePerUnit: number | null;
      priceCurrency: string | null;
      priceUpdatedAt: Date | null;
    };
    const priceById = new Map<string, IngredientPriceSelect>(
      ingredients.map((ing) => [ing.id, ing]),
    );

    return items.map((item) => {
      const price = priceById.get(item.ingredientId);
      if (!price?.pricePerUnit) return item;
      const estimatedCost = Number((price.pricePerUnit * item.qty).toFixed(2));
      return {
        ...item,
        unitPrice: price.pricePerUnit,
        currency: price.priceCurrency || "VND",
        estimatedCost,
        priceUpdatedAt: price.priceUpdatedAt,
      };
    });
  }

  async buildFromRecipes(
    userId: string,
    recipeIds: string[],
    title: string,
    persist = true,
  ) {
    const recs = await this.prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      include: { items: { include: { ingredient: true } } },
    });

    const agg = new Map<
      string,
      { ingredientId: string; name: string; unit?: string; qty: number }
    >();
    for (const r of recs) {
      for (const it of r.items) {
        const key = it.ingredient.id;
        const unit = it.unitOverride || it.ingredient.unit || undefined;
        const prev = agg.get(key);
        if (prev) prev.qty += it.amount;
        else
          agg.set(key, {
            ingredientId: it.ingredient.id,
            name: it.ingredient.name,
            unit,
            qty: it.amount,
          });
      }
    }
    const ingredientIds = Array.from(agg.keys());

    if (this.aiService.isEnabled()) {
      await this.ensureDailyIngredientPrices(ingredientIds);
    }

    const items = await this.attachPriceInfo(
      Array.from(agg.values()).map((v) => ({ ...v, checked: false })),
    );

    if (!persist) return { title, items };
    return this.prisma.shoppingList.create({
      data: {
        userId,
        title,
        items,
        weekStart: new Date(),
        weekEnd: new Date(),
      },
    });
  }
}
