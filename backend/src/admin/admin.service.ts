import { Injectable, NotFoundException, Inject, forwardRef, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PriceScraperService } from "../price-scraper/price-scraper.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => PriceScraperService))
    private priceScraperService?: PriceScraperService,
  ) {}

  async getStats() {
    try {
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

      const recentRecipes = await this.prisma.recipe.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          image: true,
          totalKcal: true,
          likes: true,
          region: true,
          tags: true,
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
        recentRecipes,
      };
    } catch (error: any) {
      console.error("Error getting stats:", error);
      throw error;
    }
  }

  async getUsers(params: { page?: number; limit?: number; search?: string }) {
    try {
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
    } catch (error: any) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  async getUser(id: string) {
    try {
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
          preference: {
            select: {
              id: true,
              gender: true,
              age: true,
              height: true,
              weight: true,
              activity: true,
              goal: true,
              dailyKcalTarget: true,
              dietType: true,
              dislikedIngredients: true,
              likedTags: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      return user;
    } catch (error: any) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async updateUserRole(id: string, role: "USER" | "ADMIN") {
    try {
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
          dob: true,
          createdAt: true,
          updatedAt: true,
          preference: {
            select: {
              id: true,
              gender: true,
              age: true,
              height: true,
              weight: true,
              activity: true,
              goal: true,
              dailyKcalTarget: true,
              dietType: true,
              dislikedIngredients: true,
              likedTags: true,
              updatedAt: true,
            },
          },
        },
      });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      throw error;
    }
  }

  async updateUser(id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    dob?: Date | string;
    avatarUrl?: string;
    role?: "USER" | "ADMIN";
    preference?: {
      gender?: string;
      age?: number;
      height?: number;
      weight?: number;
      activity?: string;
      goal?: string;
      dailyKcalTarget?: number;
      dietType?: string;
      dislikedIngredients?: string[];
      likedTags?: string[];
    };
  }) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      const { preference, ...userData } = data;

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...userData,
          dob: userData.dob ? new Date(userData.dob) : undefined,
        },
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
          preference: {
            select: {
              id: true,
              gender: true,
              age: true,
              height: true,
              weight: true,
              activity: true,
              goal: true,
              dailyKcalTarget: true,
              dietType: true,
              dislikedIngredients: true,
              likedTags: true,
              updatedAt: true,
            },
          },
        },
      });

      // Update or create preference
      if (preference) {
        await this.prisma.userPreference.upsert({
          where: { userId: id },
          create: {
            userId: id,
            ...preference,
          },
          update: preference,
        });

        // Fetch updated user with preference
        return await this.prisma.user.findUnique({
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
            preference: {
              select: {
                id: true,
                gender: true,
                age: true,
                height: true,
                weight: true,
                activity: true,
                goal: true,
                dailyKcalTarget: true,
                dietType: true,
                dislikedIngredients: true,
                likedTags: true,
                updatedAt: true,
              },
            },
          },
        });
      }

      return updatedUser;
    } catch (error: any) {
      console.error("Error updating user:", error);
      throw error;
    }
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

    if (!items || items.length === 0) {
      return {
        totalKcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };
    }

    for (const item of items) {
      if (!item.ingredient) continue;
      
      const ing = item.ingredient;
      const amount = item.amount || 0;
      if (amount <= 0) continue;
      
      // Assume ingredient nutrition is per 100g/ml
      const ratio = amount / 100;
      
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
    try {
      if (!data.title) {
        throw new Error("Title is required");
      }

      // Filter valid items
      const itemsToCreate = (data.items || []).filter((i: any) => i.ingredientId && i.amount > 0);
      
      // First create recipe with items
      const recipe = await this.prisma.recipe.create({
        data: {
          title: data.title,
          description: data.description || null,
          steps: Array.isArray(data.steps) ? data.steps : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          image: data.image || null,
          cookTime: data.cookTime || null,
          region: data.region || null,
          authorId: data.authorId || null,
          items: itemsToCreate.length > 0 ? {
            create: itemsToCreate.map((i: any) => ({
              ingredientId: i.ingredientId,
              amount: i.amount,
              unitOverride: i.unitOverride || null,
            })),
          } : undefined,
        },
        include: { items: { include: { ingredient: true } } },
      });

      // Calculate nutrition from ingredients
      const nutrition = this.calculateNutrition(recipe.items || []);
      
      // Update recipe with calculated nutrition
      return this.prisma.recipe.update({
        where: { id: recipe.id },
        data: nutrition,
        include: {
          items: { include: { ingredient: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (error: any) {
      console.error("Error creating recipe:", error);
      throw error;
    }
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

    // Filter valid items
    const itemsToCreate = (data.items || []).filter((i: any) => i.ingredientId && i.amount > 0);

    // Update recipe and create new items
    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        steps: Array.isArray(data.steps) ? data.steps : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        image: data.image || null,
        cookTime: data.cookTime || null,
        region: data.region || null,
        items: itemsToCreate.length > 0 ? {
          create: itemsToCreate.map((i: any) => ({
            ingredientId: i.ingredientId,
            amount: i.amount,
            unitOverride: i.unitOverride || null,
          })),
        } : undefined,
      },
      include: { items: { include: { ingredient: true } } },
    });

    // Calculate nutrition from ingredients
    const nutrition = this.calculateNutrition(updated.items || []);
    
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

  async getAllTags() {
    try {
      const recipes = await this.prisma.recipe.findMany({
        select: { tags: true },
      });
      
      // Collect all unique tags
      const allTags = new Set<string>();
      recipes.forEach(recipe => {
        if (Array.isArray(recipe.tags)) {
          recipe.tags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              allTags.add(tag);
            }
          });
        }
      });
      
      return Array.from(allTags).sort();
    } catch (error: any) {
      console.error("Error getting tags:", error);
      throw error;
    }
  }

  async fetchIngredientPrice(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException("Ingredient not found");
    }

    // If price scraper service is not available, return current price
    if (!this.priceScraperService) {
      return {
        id: ingredient.id,
        name: ingredient.name,
        pricePerUnit: ingredient.pricePerUnit,
        priceCurrency: ingredient.priceCurrency,
        priceUpdatedAt: ingredient.priceUpdatedAt,
        message: "Price scraper service not available",
      };
    }

    try {
      // Try to scrape price from market
      const prices = await this.priceScraperService.scrapePrices([
        { name: ingredient.name, unit: ingredient.unit || undefined },
      ]);

      const normalizedName = ingredient.name.trim().toLowerCase();
      const priceData = prices[normalizedName];
      
      if (priceData && priceData.pricePerUnit) {
        // Update ingredient with new price
        const updated = await this.prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            pricePerUnit: priceData.pricePerUnit,
            priceCurrency: priceData.currency || 'VND',
            priceUpdatedAt: new Date(),
          },
        });

        return {
          id: updated.id,
          name: updated.name,
          pricePerUnit: updated.pricePerUnit,
          priceCurrency: updated.priceCurrency,
          priceUpdatedAt: updated.priceUpdatedAt,
          source: priceData.source || 'market',
        };
      }
    } catch (error: any) {
      // If scraping fails, return current price
      console.error("Failed to scrape price:", error?.message || error);
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
    try {
      const page = params.page ? Number(params.page) : 1;
      const limit = params.limit ? Number(params.limit) : 20;
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
          select: {
            id: true,
            userId: true,
            date: true,
            note: true,
            slots: true,
            totalKcal: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      return { data, total };
    } catch (error: any) {
      console.error("Error getting meal plans:", error);
      throw error;
    }
  }

  async getMealPlan(id: string) {
    try {
      const mealPlan = await this.prisma.mealPlan.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          date: true,
          note: true,
          slots: true,
          totalKcal: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!mealPlan) {
        throw new NotFoundException("Meal plan not found");
      }

      // Fetch recipe details for each slot
      const slots = mealPlan.slots as any;
      const recipeIds: string[] = [];
      
      if (slots) {
        if (slots.breakfast) recipeIds.push(...slots.breakfast);
        if (slots.lunch) recipeIds.push(...slots.lunch);
        if (slots.dinner) recipeIds.push(...slots.dinner);
      }

      const recipes = recipeIds.length > 0
        ? await this.prisma.recipe.findMany({
            where: { id: { in: recipeIds } },
            select: {
              id: true,
              title: true,
              image: true,
              totalKcal: true,
            },
          })
        : [];

      const recipeMap: Record<string, any> = {};
      recipes.forEach(r => {
        recipeMap[r.id] = r;
      });

      return {
        ...mealPlan,
        recipes: recipeMap,
      };
    } catch (error: any) {
      console.error("Error getting meal plan:", error);
      throw error;
    }
  }

  async getFoodLogs(params: { page?: number; limit?: number; userId?: string }) {
    try {
      const page = params.page ? Number(params.page) : 1;
      const limit = params.limit ? Number(params.limit) : 20;
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
          select: {
            id: true,
            userId: true,
            date: true,
            mealType: true,
            recipeId: true,
            kcal: true,
            protein: true,
            fat: true,
            carbs: true,
            note: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      return { data, total };
    } catch (error: any) {
      console.error("Error getting food logs:", error);
      throw error;
    }
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

