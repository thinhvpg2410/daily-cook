import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ShoppingListService {
  constructor(private prisma: PrismaService) {}

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
    const items = Array.from(agg.values()).map((v) => ({
      ...v,
      checked: false,
    }));
    if (!persist) return { title, items };
    return this.prisma.shoppingList.create({ data: { userId, title, items } });
  }
}
