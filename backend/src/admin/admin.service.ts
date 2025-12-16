import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PriceScraperService } from "../price-scraper/price-scraper.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PriceScraperService))
    private priceScraperService: PriceScraperService,
  ) {}

  async getStats() {
    const [totalUsers, totalRecipes, totalMealPlans, totalFoodLogs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.recipe.count(),
      this.prisma.mealPlan.count(),
      this.prisma.foodLog.count(),
    ]);

    // Active users: users who have logged in or created content in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await this.prisma.user.count({
      where: {
        OR: [
          { createdAt: { gte: thirtyDaysAgo } },
          { recipes: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { mealPlans: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { foodLogs: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        ],
      },
    });

    const recentUsers = await this.prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      totalUsers,
      totalRecipes,
      totalMealPlans,
      totalFoodLogs,
      activeUsers,
      recentUsers,
    };
  }

  async getUsers(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { name: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatarUrl: true,
          isTwoFAEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { data, total };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isTwoFAEnabled: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateUserRole(id: string, role: "USER" | "ADMIN") {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isTwoFAEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async getRecipes(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { tags: { has: params.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { data, total };
  }

  async getRecipe(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        items: { include: { ingredient: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!recipe) {
      throw new NotFoundException("Recipe not found");
    }

    return recipe;
  }

  async deleteRecipe(id: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException("Recipe not found");
    }

    await this.prisma.recipe.delete({ where: { id } });
    return { deleted: true };
  }

  private calculateNutrition(items: Array<{ ingredient: any; amount: number }>) {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    for (const item of items) {
      const ing = item.ingredient;
      const amount = item.amount;
      // Assume ingredient nutrition is per unit (gram/ml)
      const ratio = amount / 100; // Convert to per 100g/ml
      
      if (ing.kcal) totalKcal += (ing.kcal * ratio);
      if (ing.protein) totalProtein += (ing.protein * ratio);
      if (ing.fat) totalFat += (ing.fat * ratio);
      if (ing.carbs) totalCarbs += (ing.carbs * ratio);
    }

    return {
      totalKcal: Math.round(totalKcal * 100) / 100,
      protein: Math.round(totalProtein * 100) / 100,
      fat: Math.round(totalFat * 100) / 100,
      carbs: Math.round(totalCarbs * 100) / 100,
    };
  }

  async createRecipe(data: any) {
    // First create recipe with items
    const recipe = await this.prisma.recipe.create({
      data: {
        title: data.title,
        description: data.description || null,
        steps: data.steps || [],
        tags: data.tags || [],
        image: data.image || null,
        cookTime: data.cookTime || null,
        region: data.region || null,
        authorId: data.authorId || null,
        items: {
          create: (data.items || []).map((i: any) => ({
            ingredientId: i.ingredientId,
            amount: i.amount,
            unitOverride: i.unitOverride || null,
          })),
        },
      },
      include: { items: { include: { ingredient: true } } },
    });

    // Calculate nutrition from ingredients
    const nutrition = this.calculateNutrition(recipe.items);
    
    // Update recipe with calculated nutrition
    return this.prisma.recipe.update({
      where: { id: recipe.id },
      data: nutrition,
      include: {
        items: { include: { ingredient: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateRecipe(id: string, data: any) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!recipe) {
      throw new NotFoundException("Recipe not found");
    }

    // Delete existing items
    await this.prisma.recipeItem.deleteMany({
      where: { recipeId: id },
    });

    // Update recipe and create new items
    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        steps: data.steps,
        tags: data.tags,
        image: data.image,
        cookTime: data.cookTime,
        region: data.region,
        items: {
          create: (data.items || []).map((i: any) => ({
            ingredientId: i.ingredientId,
            amount: i.amount,
            unitOverride: i.unitOverride || null,
          })),
        },
      },
      include: { items: { include: { ingredient: true } } },
    });

    // Calculate nutrition from ingredients
    const nutrition = this.calculateNutrition(updated.items);
    
    // Update recipe with calculated nutrition
    return this.prisma.recipe.update({
      where: { id },
      data: nutrition,
      include: {
        items: { include: { ingredient: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async fetchIngredientPrice(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException("Ingredient not found");
    }

    try {
      // Try to scrape price from market
      const prices = await this.priceScraperService.scrapePrices([
        { name: ingredient.name, unit: ingredient.unit || undefined },
      ]);

      const priceData = prices[ingredient.name.trim().toLowerCase()];
      if (priceData) {
        // Update ingredient with new price
        const updated = await this.prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            pricePerUnit: priceData.pricePerUnit,
            priceCurrency: priceData.currency,
            priceUpdatedAt: new Date(),
          },
        });

        return {
          id: updated.id,
          name: updated.name,
          pricePerUnit: updated.pricePerUnit,
          priceCurrency: updated.priceCurrency,
          priceUpdatedAt: updated.priceUpdatedAt,
          source: priceData.source,
        };
      }
    } catch (error) {
      // If scraping fails, return current price
      console.error("Failed to scrape price:", error);
    }

    // Return current price if scraping failed
    return {
      id: ingredient.id,
      name: ingredient.name,
      pricePerUnit: ingredient.pricePerUnit,
      priceCurrency: ingredient.priceCurrency,
      priceUpdatedAt: ingredient.priceUpdatedAt,
    };
  }

  async getMealPlans(params: { page?: number; limit?: number; userId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) {
      where.userId = params.userId;
    }

    const [total, data] = await Promise.all([
      this.prisma.mealPlan.count({ where }),
      this.prisma.mealPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { data, total };
  }

  async getFoodLogs(params: { page?: number; limit?: number; userId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) {
      where.userId = params.userId;
    }

    const [total, data] = await Promise.all([
      this.prisma.foodLog.count({ where }),
      this.prisma.foodLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { data, total };
  }

  async getIngredients(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [total, data] = await Promise.all([
      this.prisma.ingredient.count({ where }),
      this.prisma.ingredient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    return { data, total };
  }

  async createIngredient(data: any) {
    return this.prisma.ingredient.create({
      data: {
        name: data.name,
        unit: data.unit || null,
        kcal: data.kcal || null,
        protein: data.protein || null,
        fat: data.fat || null,
        carbs: data.carbs || null,
        fiber: data.fiber || null,
        sugar: data.sugar || null,
        sodium: data.sodium || null,
        pricePerUnit: data.pricePerUnit || null,
        priceCurrency: data.priceCurrency || "VND",
      },
    });
  }

  async updateIngredient(id: string, data: any) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      throw new NotFoundException("Ingredient not found");
    }

    return this.prisma.ingredient.update({
      where: { id },
      data: {
        name: data.name,
        unit: data.unit,
        kcal: data.kcal,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        pricePerUnit: data.pricePerUnit,
        priceCurrency: data.priceCurrency,
      },
    });
  }

  async deleteIngredient(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      throw new NotFoundException("Ingredient not found");
    }

    await this.prisma.ingredient.delete({ where: { id } });
    return { deleted: true };
  }
}

